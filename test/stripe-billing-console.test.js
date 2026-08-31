import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderRelnetConsole } from '../src/relnet-ui.js';

test('billing UI sends only plan slug and interval to backend Checkout',()=>{const page=renderRelnetConsole('/console/billing');const source=readFileSync(new URL('../src/relnet-ui.js',import.meta.url),'utf8');assert.match(page,/data-endpoint=["']\/v2\/billing\/me["']/);assert.match(source,/\/v2\/billing\/checkout/);assert.match(source,/\/v2\/billing\/portal/);assert.match(source,/plan_slug/);assert.match(source,/billing_interval/);assert.match(page,/data-checkout-plan=["']pro["']/);assert.match(page,/data-checkout-plan=["']team["']/);assert.match(page,/data-checkout-interval=["']month["']/);assert.match(page,/data-checkout-interval=["']year["']/);assert.doesNotMatch(source,/STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|whsec_/i);});

test('success redirect does not grant access and re-reads webhook-backed billing state',()=>{const source=readFileSync(new URL('../src/relnet-ui.js',import.meta.url),'utf8');assert.match(source,/billing.*success/i);assert.match(source,/confirmada por webhook/i);assert.match(source,/\/v2\/billing/);assert.doesNotMatch(source,/localStorage.*(?:plan|entitlement)|sessionStorage.*(?:plan|entitlement)/i);});

test('old Payment Links are removed; backend Checkout is the only purchase path',()=>{const page=renderRelnetConsole('/console/billing');assert.doesNotMatch(page,/buy\.stripe\.com/);assert.match(page,/Checkout/);assert.match(page,/Customer Portal/);});
