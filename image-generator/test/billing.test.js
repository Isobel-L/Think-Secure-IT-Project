import assert from 'node:assert/strict';
import { createSign, generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import Stripe from 'stripe';
import {
  AVATAR_CREDITS_PER_PAYMENT,
  AVATAR_PRICE_CURRENCY,
  AVATAR_PRICE_MINOR,
  buildDirectAlipayCheckoutUrl,
  constructStripeEvent,
  createPaymentCheckout,
  determinePlanPurchase,
  getConfiguredPaymentProvider,
  getPlan,
  isUnlimitedUsageEnabled,
  isTestPaymentEnabled,
  parseCnyAmountToMinor,
  publicBillingStatus,
  verifyDirectAlipayNotification,
} from '../server/billing.js';

test('publishes the fixed five-yuan Alipay price', () => {
  assert.equal(AVATAR_PRICE_MINOR, 500);
  assert.equal(AVATAR_PRICE_CURRENCY, 'cny');
  assert.equal(AVATAR_CREDITS_PER_PAYMENT, 1);
});

test('keeps free and paid generation allowance in the public billing response', () => {
  const billing = publicBillingStatus({
    freeLimit: 5,
    freeUsed: 5,
    freeRemaining: 0,
    paidCredits: 2,
    canGenerate: true,
  });

  assert.equal(billing.freeLimit, 5);
  assert.equal(billing.freeRemaining, 0);
  assert.equal(billing.paidCredits, 2);
  assert.equal(billing.canGenerate, true);
  assert.equal(billing.paymentMethod, 'alipay');
  assert.equal(billing.priceLabel, '¥5');
});

test('publishes the supported plans and rejects unknown plan ids', async () => {
  assert.equal(getPlan('go').priceMinor, 3000);
  assert.equal(getPlan('plus').dailyQuota, 15);
  assert.equal(getPlan('pro').dailyQuota, null);
  assert.equal(getPlan('unknown'), null);

  await assert.rejects(
    createPaymentCheckout({ user: { id: 'user-1' }, planId: 'unknown' }),
    (error) => error?.code === 'INVALID_PLAN',
  );
});

test('activates, renews, upgrades, and blocks downgrades according to the plan tiers', () => {
  const now = new Date('2026-07-17T02:00:00.000Z');
  const activeUntil = '2026-08-01T00:00:00.000Z';

  assert.deepEqual(
    determinePlanPurchase({ targetPlan: getPlan('go'), now }),
    { action: 'activate', amountMinor: 3000 },
  );
  assert.deepEqual(
    determinePlanPurchase({ targetPlan: getPlan('plus'), currentPlanId: 'plus', currentExpiresAt: activeUntil, now }),
    { action: 'renew', amountMinor: 5000 },
  );
  assert.deepEqual(
    determinePlanPurchase({ targetPlan: getPlan('pro'), currentPlanId: 'go', currentExpiresAt: activeUntil, now }),
    { action: 'upgrade', amountMinor: 7000 },
  );
  assert.deepEqual(
    determinePlanPurchase({ targetPlan: getPlan('plus'), currentPlanId: 'go', currentExpiresAt: activeUntil, now }),
    { action: 'upgrade', amountMinor: 2000 },
  );
  assert.throws(
    () => determinePlanPurchase({ targetPlan: getPlan('go'), currentPlanId: 'plus', currentExpiresAt: activeUntil, now }),
    (error) => error?.code === 'PLAN_DOWNGRADE_BLOCKED',
  );
  assert.throws(
    () => determinePlanPurchase({ targetPlan: getPlan('plus'), currentPlanId: 'pro', currentExpiresAt: activeUntil, now }),
    (error) => error?.code === 'PLAN_DOWNGRADE_BLOCKED',
  );
  // An expired plan counts as no plan: any tier can be bought at full price
  assert.deepEqual(
    determinePlanPurchase({ targetPlan: getPlan('go'), currentPlanId: 'pro', currentExpiresAt: '2026-07-01T00:00:00.000Z', now }),
    { action: 'activate', amountMinor: 3000 },
  );
});

test('includes the active plan and purchasable plan catalog in billing status', () => {
  const billing = publicBillingStatus({
    freeLimit: 5,
    freeUsed: 5,
    freeRemaining: 0,
    paidCredits: 0,
    canGenerate: true,
    plan: {
      id: 'go',
      name: 'Go',
      expiresAt: '2026-08-16T00:00:00.000Z',
      dailyQuota: 3,
      dailyUsed: 1,
      dailyRemaining: 2,
      unlimited: false,
    },
  });

  assert.equal(billing.plan.id, 'go');
  assert.equal(billing.plan.dailyRemaining, 2);
  assert.deepEqual(billing.plans.map(({ id, priceLabel }) => [id, priceLabel]), [
    ['go', '¥30'],
    ['plus', '¥50'],
    ['pro', '¥100'],
  ]);
});

test('parses Alipay yuan amounts without floating-point rounding', () => {
  assert.equal(parseCnyAmountToMinor('5.00'), 500);
  assert.equal(parseCnyAmountToMinor('5'), 500);
  assert.equal(parseCnyAmountToMinor('0.01'), 1);
  assert.equal(parseCnyAmountToMinor('5.001'), null);
  assert.equal(parseCnyAmountToMinor('-5.00'), null);
  assert.equal(parseCnyAmountToMinor('not-an-amount'), null);
});

test('only enables simulated payments for explicit loopback development configuration', () => {
  const keys = ['ENABLE_TEST_PAYMENTS', 'NODE_ENV', 'FRONTEND_BASE_URL', 'PUBLIC_API_BASE_URL'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  try {
    Object.assign(process.env, {
      ENABLE_TEST_PAYMENTS: 'true',
      NODE_ENV: 'development',
      FRONTEND_BASE_URL: 'http://127.0.0.1:5173',
      PUBLIC_API_BASE_URL: 'http://localhost:8787',
    });
    assert.equal(isTestPaymentEnabled(), true);

    process.env.NODE_ENV = 'production';
    assert.equal(isTestPaymentEnabled(), false);

    process.env.NODE_ENV = 'development';
    process.env.PUBLIC_API_BASE_URL = 'https://avatar.example.com';
    assert.equal(isTestPaymentEnabled(), false);

    process.env.ENABLE_TEST_PAYMENTS = 'false';
    process.env.PUBLIC_API_BASE_URL = 'http://127.0.0.1:8787';
    assert.equal(isTestPaymentEnabled(), false);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test('only enables unlimited usage for explicit loopback development configuration', () => {
  const keys = ['DEV_UNLIMITED_USAGE', 'NODE_ENV', 'FRONTEND_BASE_URL', 'PUBLIC_API_BASE_URL'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    Object.assign(process.env, {
      DEV_UNLIMITED_USAGE: 'true',
      NODE_ENV: 'development',
      FRONTEND_BASE_URL: 'http://127.0.0.1:5173',
      PUBLIC_API_BASE_URL: 'http://localhost:8787',
    });
    assert.equal(isUnlimitedUsageEnabled(), true);
    const billing = publicBillingStatus({ freeRemaining: 0, paidCredits: 0, canGenerate: false });
    assert.equal(billing.unlimitedUsage, true);
    assert.equal(billing.canDownload, true);

    process.env.NODE_ENV = 'production';
    assert.equal(isUnlimitedUsageEnabled(), false);
    process.env.NODE_ENV = 'development';
    process.env.PUBLIC_API_BASE_URL = 'https://avatar.example.com';
    assert.equal(isUnlimitedUsageEnabled(), false);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test('builds and verifies a direct Alipay RSA2 checkout flow', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  const envKeys = [
    'PAYMENT_PROVIDER',
    'ALIPAY_APP_ID',
    'ALIPAY_PRIVATE_KEY',
    'ALIPAY_PUBLIC_KEY',
    'ALIPAY_KEY_TYPE',
    'ALIPAY_GATEWAY',
    'ALIPAY_NOTIFY_URL',
    'FRONTEND_BASE_URL',
    'PUBLIC_API_BASE_URL',
  ];
  const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const appId = '2026000000000001';
  const orderId = 'de47c266-e62a-4433-a69a-ec47ceabd334';

  Object.assign(process.env, {
    PAYMENT_PROVIDER: 'alipay',
    ALIPAY_APP_ID: appId,
    ALIPAY_PRIVATE_KEY: privateKey,
    ALIPAY_PUBLIC_KEY: publicKey,
    ALIPAY_KEY_TYPE: 'PKCS8',
    ALIPAY_GATEWAY: 'https://openapi.alipay.test/gateway.do',
    ALIPAY_NOTIFY_URL: 'https://api.example.com/api/billing/alipay/notify',
    FRONTEND_BASE_URL: 'https://avatar.example.com',
    PUBLIC_API_BASE_URL: 'https://api.example.com',
  });

  try {
    assert.equal(getConfiguredPaymentProvider(), 'alipay');
    const checkoutUrl = new URL(buildDirectAlipayCheckoutUrl({ orderId }));
    assert.equal(checkoutUrl.origin, 'https://openapi.alipay.test');
    assert.equal(checkoutUrl.searchParams.get('method'), 'alipay.trade.page.pay');
    assert.equal(checkoutUrl.searchParams.get('app_id'), appId);
    assert.equal(checkoutUrl.searchParams.get('notify_url'), 'https://api.example.com/api/billing/alipay/notify');

    const returnUrl = new URL(checkoutUrl.searchParams.get('return_url'));
    assert.equal(returnUrl.searchParams.get('payment'), 'success');
    assert.equal(returnUrl.searchParams.get('order_id'), orderId);
    const bizContent = JSON.parse(checkoutUrl.searchParams.get('biz_content'));
    assert.equal(bizContent.out_trade_no, orderId);
    assert.equal(bizContent.total_amount, '5.00');
    assert.equal(bizContent.product_code, 'FAST_INSTANT_TRADE_PAY');

    const notification = {
      app_id: appId,
      out_trade_no: orderId,
      trade_no: '2026071322000000000001',
      trade_status: 'TRADE_SUCCESS',
      total_amount: '5.00',
      sign_type: 'RSA2',
    };
    const signContent = Object.keys(notification)
      .sort()
      .map((key) => `${key}=${notification[key]}`)
      .join('&');
    notification.sign = createSign('RSA-SHA256').update(signContent, 'utf8').sign(privateKey, 'base64');

    assert.equal(verifyDirectAlipayNotification(notification), true);
    assert.equal(verifyDirectAlipayNotification({ ...notification, total_amount: '50.00' }), false);
  } finally {
    for (const key of envKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test('verifies Stripe webhook signatures against the raw request body', () => {
  const payload = JSON.stringify({ id: 'evt_test', type: 'checkout.session.completed' });
  const webhookSecret = 'whsec_test_billing_signature';
  const stripe = new Stripe('sk_test_placeholder');
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });

  process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
  process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
  try {
    const event = constructStripeEvent(Buffer.from(payload), signature);
    assert.equal(event.id, 'evt_test');
    assert.throws(() => constructStripeEvent(Buffer.from(payload), 'invalid'));
  } finally {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  }
});
