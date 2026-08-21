import AlipaySdk from 'alipay-sdk';
import Stripe from 'stripe';
import {
  attachPaymentSession,
  createPaymentOrder,
  createTestPaymentCredit,
  fulfillPaymentOrder,
  getGenerationAllowance,
  getPaymentOrder,
} from './db.js';

export const AVATAR_PRICE_MINOR = 500;
export const AVATAR_PRICE_CURRENCY = 'cny';
export const AVATAR_CREDITS_PER_PAYMENT = 1;
export const PLANS = {
  go: {
    id: 'go',
    name: 'Go',
    tier: 1,
    priceMinor: 3000,
    dailyQuota: 3,
    durationDays: 30,
    quotaLabel: '每日 3 个额度',
    refreshLabel: '次日刷新',
    description: '适合偶尔出图的轻量用户',
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    tier: 2,
    priceMinor: 5000,
    dailyQuota: 15,
    durationDays: 30,
    quotaLabel: '每日 15 个额度',
    refreshLabel: '次日刷新',
    description: '适合高频创作，每天都有充足额度',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tier: 3,
    priceMinor: 10000,
    dailyQuota: null,
    durationDays: 30,
    quotaLabel: '无限额度',
    refreshLabel: '30 天刷新',
    description: '订阅期内不限下载次数，畅快出图',
  },
};

export function getPlan(planId) {
  return typeof planId === 'string' ? PLANS[planId] || null : null;
}

export function determinePlanPurchase({ targetPlan, currentPlanId = null, currentExpiresAt = null, now = new Date() }) {
  const expires = currentExpiresAt ? new Date(currentExpiresAt) : null;
  const activeId = expires && Number.isFinite(expires.getTime()) && expires > now ? currentPlanId : null;
  const current = activeId ? getPlan(activeId) : null;
  if (!current) return { action: 'activate', amountMinor: targetPlan.priceMinor };
  if (current.id === targetPlan.id) return { action: 'renew', amountMinor: targetPlan.priceMinor };
  if (targetPlan.tier > current.tier) {
    return { action: 'upgrade', amountMinor: targetPlan.priceMinor - current.priceMinor };
  }
  const error = new Error('An active higher-tier plan cannot be downgraded.');
  error.code = 'PLAN_DOWNGRADE_BLOCKED';
  throw error;
}

function frontendBaseUrl() {
  return (process.env.FRONTEND_BASE_URL || 'http://127.0.0.1:5173').replace(/\/+$/, '');
}

function publicApiBaseUrl() {
  return (process.env.PUBLIC_API_BASE_URL || 'http://127.0.0.1:8787').replace(/\/+$/, '');
}

function normalizeKey(value = '') {
  return String(value).replace(/\\n/g, '\n').trim();
}

function requestedPaymentProvider() {
  const value = String(process.env.PAYMENT_PROVIDER || 'auto').trim().toLowerCase();
  return ['alipay', 'stripe'].includes(value) ? value : 'auto';
}

function isLoopbackUrl(value) {
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(value).hostname);
  } catch {
    return false;
  }
}

function stripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  return secretKey ? new Stripe(secretKey) : null;
}

function directAlipayClient() {
  if (!isDirectAlipayConfigured()) return null;
  return new AlipaySdk({
    appId: String(process.env.ALIPAY_APP_ID).trim(),
    privateKey: normalizeKey(process.env.ALIPAY_PRIVATE_KEY),
    alipayPublicKey: normalizeKey(process.env.ALIPAY_PUBLIC_KEY),
    signType: 'RSA2',
    keyType: String(process.env.ALIPAY_KEY_TYPE || 'PKCS8').toUpperCase() === 'PKCS1' ? 'PKCS1' : 'PKCS8',
    gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
    timeout: 10000,
    camelcase: true,
  });
}

function paymentReturnUrl(orderId) {
  const url = new URL(frontendBaseUrl());
  url.searchParams.set('payment', 'success');
  url.searchParams.set('order_id', orderId);
  url.hash = 'customizer';
  return url.toString();
}

function paymentCancelUrl() {
  const url = new URL(frontendBaseUrl());
  url.searchParams.set('payment', 'cancelled');
  url.hash = 'customizer';
  return url.toString();
}

function alipayNotifyUrl() {
  return process.env.ALIPAY_NOTIFY_URL || `${publicApiBaseUrl()}/api/billing/alipay/notify`;
}

function yuanAmount(amountMinor) {
  return (Number(amountMinor) / 100).toFixed(2);
}

export function parseCnyAmountToMinor(value) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value || '').trim());
  if (!match) return null;
  const amount = (BigInt(match[1]) * 100n) + BigInt((match[2] || '').padEnd(2, '0'));
  return amount <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(amount) : null;
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function isDirectAlipayConfigured() {
  return Boolean(
    String(process.env.ALIPAY_APP_ID || '').trim()
    && normalizeKey(process.env.ALIPAY_PRIVATE_KEY)
    && normalizeKey(process.env.ALIPAY_PUBLIC_KEY),
  );
}

export function getConfiguredPaymentProvider() {
  const requested = requestedPaymentProvider();
  if (requested === 'alipay') return isDirectAlipayConfigured() ? 'alipay' : null;
  if (requested === 'stripe') return isStripeConfigured() ? 'stripe' : null;
  if (isDirectAlipayConfigured()) return 'alipay';
  if (isStripeConfigured()) return 'stripe';
  return null;
}

export function isPaymentConfigured() {
  return Boolean(getConfiguredPaymentProvider());
}

export function isTestPaymentEnabled() {
  return process.env.ENABLE_TEST_PAYMENTS === 'true'
    && process.env.NODE_ENV !== 'production'
    && isLoopbackUrl(frontendBaseUrl())
    && isLoopbackUrl(publicApiBaseUrl());
}

export function isUnlimitedUsageEnabled() {
  return process.env.DEV_UNLIMITED_USAGE === 'true'
    && process.env.NODE_ENV !== 'production'
    && isLoopbackUrl(frontendBaseUrl())
    && isLoopbackUrl(publicApiBaseUrl());
}

export function publicBillingStatus(allowance) {
  const status = allowance || {
    freeLimit: 5,
    freeUsed: 0,
    freeRemaining: 0,
    paidCredits: 0,
    plan: null,
    canGenerate: false,
  };
  const provider = getConfiguredPaymentProvider();
  const unlimitedUsage = isUnlimitedUsageEnabled();
  return {
    ...status,
    canGenerate: unlimitedUsage || status.canGenerate,
    canDownload: unlimitedUsage || status.canGenerate,
    unlimitedUsage,
    provider: provider || (requestedPaymentProvider() === 'auto' ? 'none' : requestedPaymentProvider()),
    paymentMethod: 'alipay',
    priceMinor: AVATAR_PRICE_MINOR,
    currency: AVATAR_PRICE_CURRENCY,
    priceLabel: '¥5',
    plan: status.plan || null,
    plans: Object.values(PLANS).map((plan) => ({
      ...plan,
      priceLabel: `¥${plan.priceMinor / 100}`,
    })),
    configured: Boolean(provider),
    testPaymentEnabled: isTestPaymentEnabled(),
  };
}

export async function getBillingStatus(userId) {
  return publicBillingStatus(await getGenerationAllowance(userId));
}

async function ensurePaymentIsRequired(user) {
  const billing = await getBillingStatus(user.id);
  if (!billing.canGenerate) return billing;

  const error = new Error('This account still has an available download entitlement.');
  error.code = 'GENERATION_ENTITLEMENT_AVAILABLE';
  error.billing = billing;
  throw error;
}

export function buildDirectAlipayCheckoutUrl({
  orderId,
  amountMinor = AVATAR_PRICE_MINOR,
  subject = '天猫 AI 头像下载',
  body = '购买 1 次 AI 头像下载额度',
}) {
  const alipay = directAlipayClient();
  if (!alipay) {
    const error = new Error('Direct Alipay payment is not configured.');
    error.code = 'PAYMENT_NOT_CONFIGURED';
    throw error;
  }

  return alipay.pageExec('alipay.trade.page.pay', {
    method: 'GET',
    notifyUrl: alipayNotifyUrl(),
    returnUrl: paymentReturnUrl(orderId),
    bizContent: {
      out_trade_no: orderId,
      product_code: 'FAST_INSTANT_TRADE_PAY',
      total_amount: yuanAmount(amountMinor),
      subject,
      body,
      timeout_express: '15m',
    },
  });
}

async function checkoutProduct(userId, plan) {
  if (!plan) {
    return {
      amountMinor: AVATAR_PRICE_MINOR,
      credits: AVATAR_CREDITS_PER_PAYMENT,
      planId: null,
      planAction: null,
      name: '天猫 AI 头像下载',
      description: '购买 1 次 AI 头像下载额度',
    };
  }
  const allowance = await getGenerationAllowance(userId);
  const { action, amountMinor } = determinePlanPurchase({
    targetPlan: plan,
    currentPlanId: allowance?.plan?.id || null,
    currentExpiresAt: allowance?.plan?.expiresAt || null,
  });
  const namePrefix = { activate: '', renew: '续订', upgrade: '升级' }[action];
  return {
    amountMinor,
    credits: 0,
    planId: plan.id,
    planAction: action,
    name: `天猫AI头像 ${namePrefix}${plan.name} 套餐`,
    description: plan.description,
  };
}

function resolveRequestedPlan(planId) {
  if (!planId) return null;
  const plan = getPlan(planId);
  if (plan) return plan;
  const error = new Error('The requested plan is invalid.');
  error.code = 'INVALID_PLAN';
  throw error;
}

async function createDirectAlipayCheckout({ user, plan }) {
  if (!plan) await ensurePaymentIsRequired(user);
  if (!isDirectAlipayConfigured()) {
    const error = new Error('Direct Alipay payment is not configured.');
    error.code = 'PAYMENT_NOT_CONFIGURED';
    throw error;
  }

  const product = await checkoutProduct(user.id, plan);
  const order = await createPaymentOrder({
    userId: user.id,
    provider: 'alipay',
    amountMinor: product.amountMinor,
    currency: AVATAR_PRICE_CURRENCY,
    credits: product.credits,
    planId: product.planId,
    planAction: product.planAction,
  });
  const attached = await attachPaymentSession({
    orderId: order.id,
    userId: user.id,
    providerSessionId: order.id,
  });
  if (!attached) throw new Error('Alipay order could not be attached to the payment record.');

  return {
    provider: 'alipay',
    orderId: order.id,
    sessionId: order.id,
    url: buildDirectAlipayCheckoutUrl({
      orderId: order.id,
      amountMinor: product.amountMinor,
      subject: product.name,
      body: product.description,
    }),
    amountMinor: product.amountMinor,
    currency: AVATAR_PRICE_CURRENCY,
    paymentMethod: 'alipay',
    planId: product.planId,
  };
}

async function createStripeAlipayCheckout({ user, plan }) {
  if (!plan) await ensurePaymentIsRequired(user);
  const stripe = stripeClient();
  if (!stripe) {
    const error = new Error('STRIPE_SECRET_KEY is not configured.');
    error.code = 'PAYMENT_NOT_CONFIGURED';
    throw error;
  }

  const product = await checkoutProduct(user.id, plan);
  const order = await createPaymentOrder({
    userId: user.id,
    provider: 'stripe',
    amountMinor: product.amountMinor,
    currency: AVATAR_PRICE_CURRENCY,
    credits: product.credits,
    planId: product.planId,
    planAction: product.planAction,
  });
  const metadata = {
    orderId: order.id,
    userId: user.id,
    product: 'avatar_download',
    credits: String(product.credits),
    ...(product.planId ? { planId: product.planId } : {}),
  };
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['alipay'],
    client_reference_id: order.id,
    customer_email: user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: AVATAR_PRICE_CURRENCY,
          unit_amount: product.amountMinor,
          product_data: {
            name: product.name,
            description: product.description,
          },
        },
      },
    ],
    metadata,
    payment_intent_data: { metadata },
    success_url: `${frontendBaseUrl()}/?payment=success&session_id={CHECKOUT_SESSION_ID}#customizer`,
    cancel_url: paymentCancelUrl(),
  });

  const attached = await attachPaymentSession({
    orderId: order.id,
    userId: user.id,
    providerSessionId: session.id,
  });
  if (!attached || !session.url) throw new Error('Stripe Checkout Session could not be attached to the payment order.');

  return {
    provider: 'stripe',
    orderId: order.id,
    sessionId: session.id,
    url: session.url,
    amountMinor: product.amountMinor,
    currency: AVATAR_PRICE_CURRENCY,
    paymentMethod: 'alipay',
    planId: product.planId,
  };
}

export async function createPaymentCheckout({ user, planId = null }) {
  const plan = resolveRequestedPlan(planId);
  const provider = getConfiguredPaymentProvider();
  if (provider === 'alipay') return createDirectAlipayCheckout({ user, plan });
  if (provider === 'stripe') return createStripeAlipayCheckout({ user, plan });

  const error = new Error('No payment provider is configured.');
  error.code = 'PAYMENT_NOT_CONFIGURED';
  throw error;
}

export async function createLocalTestPurchase(userId, planId = null) {
  if (!isTestPaymentEnabled()) {
    const error = new Error('Local test payments are disabled.');
    error.code = 'TEST_PAYMENT_DISABLED';
    throw error;
  }

  const plan = resolveRequestedPlan(planId);
  const product = await checkoutProduct(userId, plan);
  const fulfilled = await createTestPaymentCredit({
    userId,
    amountMinor: product.amountMinor,
    currency: AVATAR_PRICE_CURRENCY,
    credits: product.credits,
    planId: product.planId,
    planAction: product.planAction,
  });
  return {
    paid: true,
    simulated: true,
    orderId: fulfilled.orderId,
    planId: product.planId,
    planAction: product.planAction,
    billing: publicBillingStatus(fulfilled.allowance),
  };
}

export function constructStripeEvent(rawBody, signature) {
  const stripe = stripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  if (!stripe || !webhookSecret) throw new Error('Stripe webhook is not configured.');
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

export async function fulfillStripeCheckout(sessionId, expectedUserId = null) {
  const stripe = stripeClient();
  if (!stripe) throw new Error('STRIPE_SECRET_KEY is not configured.');

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const userId = session.metadata?.userId || '';
  if (!userId || (expectedUserId && expectedUserId !== userId)) {
    const error = new Error('This payment does not belong to the current account.');
    error.code = 'PAYMENT_ACCOUNT_MISMATCH';
    throw error;
  }
  if (session.payment_status === 'unpaid') {
    return { paid: false, billing: await getBillingStatus(userId) };
  }

  const fulfilled = await fulfillPaymentOrder({
    provider: 'stripe',
    providerSessionId: session.id,
    providerPaymentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
    amountMinor: session.amount_total,
    currency: session.currency,
    orderId: session.metadata?.orderId,
    userId,
  });
  return {
    paid: true,
    billing: publicBillingStatus(fulfilled.allowance),
    orderId: fulfilled.orderId,
  };
}

function alipayField(payload, key) {
  return typeof payload?.[key] === 'string' ? payload[key].trim() : '';
}

export function verifyDirectAlipayNotification(payload) {
  const alipay = directAlipayClient();
  if (!alipay || !payload || typeof payload !== 'object') return false;
  if (alipayField(payload, 'app_id') !== String(process.env.ALIPAY_APP_ID).trim()) return false;
  const sellerId = String(process.env.ALIPAY_SELLER_ID || '').trim();
  if (sellerId && alipayField(payload, 'seller_id') !== sellerId) return false;
  return alipay.checkNotifySign(payload, true);
}

function isPaidAlipayTradeStatus(status) {
  return status === 'TRADE_SUCCESS' || status === 'TRADE_FINISHED';
}

export async function fulfillDirectAlipayNotification(payload) {
  if (!verifyDirectAlipayNotification(payload)) {
    const error = new Error('Invalid Alipay notification signature or merchant identity.');
    error.code = 'INVALID_ALIPAY_NOTIFICATION';
    throw error;
  }

  const tradeStatus = alipayField(payload, 'trade_status');
  if (!isPaidAlipayTradeStatus(tradeStatus)) return { paid: false };

  const orderId = alipayField(payload, 'out_trade_no');
  const tradeNo = alipayField(payload, 'trade_no');
  const amountMinor = parseCnyAmountToMinor(alipayField(payload, 'total_amount'));
  if (!orderId || !tradeNo || amountMinor === null) {
    const error = new Error('Alipay notification is missing required payment fields.');
    error.code = 'INVALID_ALIPAY_NOTIFICATION';
    throw error;
  }

  const fulfilled = await fulfillPaymentOrder({
    provider: 'alipay',
    providerSessionId: orderId,
    providerPaymentId: tradeNo,
    amountMinor,
    currency: AVATAR_PRICE_CURRENCY,
    orderId,
  });
  return {
    paid: true,
    orderId: fulfilled.orderId,
    billing: publicBillingStatus(fulfilled.allowance),
  };
}

async function confirmDirectAlipayCheckout(orderId, userId) {
  const order = await getPaymentOrder({ orderId, userId });
  if (!order || order.provider !== 'alipay') {
    const error = new Error('This payment does not belong to the current account.');
    error.code = 'PAYMENT_ACCOUNT_MISMATCH';
    throw error;
  }
  if (order.status === 'paid') {
    return { paid: true, orderId: order.id, billing: await getBillingStatus(userId) };
  }

  const alipay = directAlipayClient();
  if (!alipay) {
    const error = new Error('Direct Alipay payment is not configured.');
    error.code = 'PAYMENT_NOT_CONFIGURED';
    throw error;
  }
  const result = await alipay.exec(
    'alipay.trade.query',
    { bizContent: { out_trade_no: order.id } },
    { validateSign: true },
  );
  if (result?.code !== '10000' || !isPaidAlipayTradeStatus(result.tradeStatus)) {
    return { paid: false, orderId: order.id, billing: await getBillingStatus(userId) };
  }
  if (result.outTradeNo !== order.id) throw new Error('Alipay query returned a different merchant order number.');
  const amountMinor = parseCnyAmountToMinor(result.totalAmount);
  if (!result.tradeNo || amountMinor === null) {
    throw new Error('Alipay query response is missing required payment fields.');
  }

  const fulfilled = await fulfillPaymentOrder({
    provider: 'alipay',
    providerSessionId: order.id,
    providerPaymentId: result.tradeNo,
    amountMinor,
    currency: AVATAR_PRICE_CURRENCY,
    orderId: order.id,
    userId,
  });
  return {
    paid: true,
    orderId: fulfilled.orderId,
    billing: publicBillingStatus(fulfilled.allowance),
  };
}

export async function confirmPayment({ sessionId, orderId, userId }) {
  if (orderId) return confirmDirectAlipayCheckout(orderId, userId);
  if (sessionId?.startsWith('cs_')) return fulfillStripeCheckout(sessionId, userId);

  const error = new Error('Payment confirmation parameters are invalid.');
  error.code = 'INVALID_CHECKOUT_REFERENCE';
  throw error;
}
