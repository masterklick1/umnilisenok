import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paymentStatus } from './manual-payment-status.mjs';

test('request waits for approval and does not grant access', () => {
  assert.deepEqual(paymentStatus([{ status: 'pending' }]), { approved: false, pending: true, receipt: null });
});

test('approval grants access and issues a receipt for 10 somoni to the linked account', () => {
  const row = { id: 'order-1', email: 'parent@example.com', amount: '10 TJS', status: 'approved', approved_at: '2026-11-24T05:23:00Z' };
  assert.deepEqual(paymentStatus([row, { status: 'pending' }]), {
    approved: true, pending: false,
    receipt: { id: 'order-1', email: 'parent@example.com', amount: '10 TJS', approved_at: '2026-11-24T05:23:00Z' },
  });
});

test('no payment or rejected payment never grants access', () => {
  assert.equal(paymentStatus([]).approved, false);
  assert.equal(paymentStatus([{ status: 'rejected' }]).approved, false);
});