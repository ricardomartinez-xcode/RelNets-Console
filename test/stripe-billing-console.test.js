import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderRelnetConsole } from '../src/relnet-ui.js';

test('billing UI sends only plan slug and interval to backend Checkout', () => {
  const page = renderRelnetConsole('/console/billing');
  const source = readFileSync(new URL('../src/relnet-ui.js', import.meta.url), 'utf8');

  assert.match(page, /data-endpoint=["']\/v2\/billing\/me["']/);
  assert.match(source, /\/v2\/billing\/checkout/);
  assert.match(source, /\/v2\/billing\/portal/);
  assert.match(source, /plan_slug/);
  assert.match(source, /billing_interval/);
  assert.match(page, /data-checkout-plan=["']pro["']/);
  assert.match(page, /data-checkout-plan=["']team["']/);
  assert.match(page, /data-checkout-interval=["']month["']/);
  assert.match(page, /data-checkout-interval=["']year["']/);

  assert.doesNotMatch(page, /price_1U8DF/i);
  assert.doesNotMatch(source, /STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|whsec_/i);
});

test('success redirect does not grant access and re-reads webhook-backed billing state', () => {
  const source = readFileSync(new URL('../src/relnet-ui.js', import.meta.url), 'utf8');
  assert.match(source, /billing.*success/i);
  assert.match(source, /confirmada por webhook/i);
  assert.match(source, /\/v2\/billing/);
  assert.doesNotMatch(source, /localStorage.*(?:plan|entitlement)|sessionStorage.*(?:plan|entitlement)/i);
});

test('Payment Links remain visible only as explicit fallback options', () => {
  const page = renderRelnetConsole('/console/billing');
  assert.match(page, /Fallback de pago/i);
  for (const url of [
    'https://buy.stripe.com/00w8wI0KS5YnbxwbPB3cc01',
    'https://buy.stripe.com/5kQ3co9hogD1ats9Ht3cc02',
    'https://buy.stripe.com/14AdR279g86v4542f13cc03',
    'https://buy.stripe.com/5kQ4gsdxEfyX5985rd3cc04',
  ]) {
    assert.match(page, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
