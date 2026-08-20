import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateDashboardMonetization, canLoadDashboardProvider, monetizationEnabled } from '../app/lib/monetization/policy.ts';

const root = process.cwd();
const read = (p) => readFileSync(join(root, p), 'utf8');

test('Free dashboard permits native direct sponsor only on explicitly safe dashboard surfaces', () => {
  assert.equal(evaluateDashboardMonetization({ surface: 'account_dashboard', plan: 'free', format: 'native_direct_sponsor' }).allowed, true);
  assert.equal(evaluateDashboardMonetization({ surface: 'account_dashboard', plan: 'free', format: 'third_party_ad' }).allowed, false);
});

test('paid plans are ad-free', () => {
  for (const plan of ['pro', 'team', 'business']) {
    assert.equal(evaluateDashboardMonetization({ surface: 'account_dashboard', plan, format: 'native_direct_sponsor' }).allowed, false, plan);
  }
});

test('sensitive and unknown surfaces fail closed for every ad format', () => {
  for (const surface of ['auth','ssh_terminal','pairing','recovery','internal_console','remote_chrome_extension','private_chat','email_message','unknown']) {
    assert.equal(evaluateDashboardMonetization({ surface, plan: 'free', format: 'native_direct_sponsor' }).allowed, false, surface);
    assert.equal(evaluateDashboardMonetization({ surface, plan: 'free', format: 'third_party_ad' }).allowed, false, surface);
  }
});

test('dashboard never loads a third-party advertising provider', () => {
  assert.equal(canLoadDashboardProvider({ surface: 'account_dashboard', plan: 'free', provider: 'direct' }), true);
  assert.equal(canLoadDashboardProvider({ surface: 'account_dashboard', plan: 'free', provider: 'third_party' }), false);
  const consoleRoute = read('app/console/route.ts');
  assert.match(consoleRoute, /script-src 'self'/);
  assert.match(consoleRoute, /connect-src 'self'/);
});

test('monetization remains disabled by default', () => {
  assert.equal(monetizationEnabled({}), false);
  assert.equal(monetizationEnabled({ RELEAD_MONETIZATION_ENABLED: 'true' }), true);
});

test('FreePlanSponsor is integrated only into safe account dashboard, never auth/security/console shell', () => {
  const account = read('app/account/page.tsx');
  assert.match(account, /FreePlanSponsor/);
  assert.match(account, /surface="account_dashboard"/);
  for (const path of ['app/console/login/page.tsx','app/register/page.tsx','app/security/otp/page.tsx','app/console/route.ts']) {
    assert.doesNotMatch(read(path), /FreePlanSponsor|third.?party.?ad|adscript/i, path);
  }
});
