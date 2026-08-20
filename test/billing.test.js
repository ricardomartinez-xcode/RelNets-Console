import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../app/billing/page.tsx', import.meta.url), 'utf8');

test('billing UI consumes authoritative backend billing state', () => {
  assert.match(page, /me\.billing/);
  assert.match(page, /current_period_end/);
  assert.match(page, /cancel_at_period_end/);
  assert.match(page, /customer_configured/);
});

test('billing UI handles Stripe success and cancel as recoverable return states', () => {
  assert.match(page, /billing=success|searchParams\.get\(['"]billing['"]\)/);
  assert.match(page, /cancel/);
  assert.match(page, /confirmad|confirmación|webhook/i);
  assert.match(page, /reintentar|retry/i);
});

test('only Pro can invoke self-service checkout and sales-assisted plans stay non-self-service', () => {
  assert.match(page, /plan_slug:\s*['"]pro['"]/);
  assert.match(page, /plan\.self_service/);
  assert.match(page, /Venta asistida|Hablar con ReLead/);
});

test('confirmed Pro state offers post-upgrade onboarding', () => {
  assert.match(page, /onboarding|Primer nodo|Configurar Pro/i);
});


test('session wiring forwards backend billing object and billing page has no legacy app target', async () => {
  const session = await readFile(new URL('../app/lib/session.ts', import.meta.url), 'utf8');
  assert.match(session, /billing_state:\s*billing\.billing\s*\|\|\s*null/);
  assert.doesNotMatch(page, /https:\/\/app\.relead\.com\.mx/);
});
