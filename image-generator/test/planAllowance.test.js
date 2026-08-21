import assert from 'node:assert/strict';
import test from 'node:test';
import { getPlan } from '../server/billing.js';
import { pickDeductionSource, shanghaiToday } from '../server/db.js';

const now = new Date('2026-07-17T02:00:00.000Z');
const expiresAt = '2026-08-16T02:00:00.000Z';
const planState = (id, dailyDate = '2026-07-17') => ({
  ...getPlan(id),
  expiresAt,
  dailyDate,
  unlimited: getPlan(id).dailyQuota === null,
});

test('formats the current natural day in Asia/Shanghai', () => {
  assert.equal(shanghaiToday(new Date('2026-07-16T15:59:59.000Z')), '2026-07-16');
  assert.equal(shanghaiToday(new Date('2026-07-16T16:00:00.000Z')), '2026-07-17');
  assert.match(shanghaiToday(), /^\d{4}-\d{2}-\d{2}$/);
});

test('uses Pro without consuming free or paid allowance', () => {
  assert.equal(pickDeductionSource({
    plan: planState('pro'),
    dailyUsed: 99,
    freeUsed: 5,
    paidCredits: 0,
    today: '2026-07-17',
    now,
  }), 'plan');
});

test('falls through from an exhausted daily plan to free and then paid allowance', () => {
  assert.equal(pickDeductionSource({
    plan: planState('go'),
    dailyUsed: 3,
    freeUsed: 2,
    paidCredits: 1,
    today: '2026-07-17',
    now,
  }), 'free');
  assert.equal(pickDeductionSource({
    plan: planState('go'),
    dailyUsed: 3,
    freeUsed: 5,
    paidCredits: 1,
    today: '2026-07-17',
    now,
  }), 'paid');
});

test('resets finite plan usage when the Shanghai date changes', () => {
  assert.equal(pickDeductionSource({
    plan: planState('go', '2026-07-16'),
    dailyUsed: 3,
    freeUsed: 5,
    paidCredits: 0,
    today: '2026-07-17',
    now,
  }), 'plan');
});

test('compares PostgreSQL Date values using their local calendar date', () => {
  // node-postgres parses DATE columns as local-timezone midnight.
  assert.equal(pickDeductionSource({
    plan: planState('go', new Date(2026, 6, 17)),
    dailyUsed: 3,
    freeUsed: 0,
    paidCredits: 0,
    today: '2026-07-17',
    now,
  }), 'free');
});

test('ignores an expired plan and reports no source after all fallback allowance is used', () => {
  assert.equal(pickDeductionSource({
    plan: { ...planState('plus'), expiresAt: '2026-07-17T01:59:59.000Z' },
    dailyUsed: 0,
    freeUsed: 4,
    paidCredits: 0,
    today: '2026-07-17',
    now,
  }), 'free');
  assert.equal(pickDeductionSource({
    plan: null,
    freeUsed: 5,
    paidCredits: 0,
    today: '2026-07-17',
    now,
  }), null);
});
