import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_CONSOLE_ORIGIN,
  DEFAULT_CONSOLE_UI_ORIGIN,
  assertDistinctUiOrigin,
  canonicalConsoleUrl,
  isBackendProxyPath,
  isConsoleUiPath,
  normalizeOrigin,
  normalizeUiOrigin,
  rewriteUiLocation
} from '../src/policy.js';

test('backend and UI routing are mutually explicit', () => {
  for (const path of ['/admin/api/session', '/console/api/modules/relnet', '/api/v1/billing/plans', '/relnet/v1/nodes', '/auth/register', '/oauth/authorize', '/install/downloads/linux', '/ws/terminal']) {
    assert.equal(isBackendProxyPath(path, 'GET'), true, path);
  }
  assert.equal(isBackendProxyPath('/console/login', 'POST'), true);
  assert.equal(isBackendProxyPath('/console/login', 'GET'), false);
  for (const path of ['/console/', '/console/login', '/register', '/security/otp', '/security/otp/setup', '/billing']) {
    assert.equal(isConsoleUiPath(path), true, path);
  }
  assert.equal(isConsoleUiPath('/console/api/session'), false);
  assert.equal(isConsoleUiPath('/auth/register'), false);
});

test('canonical admin graphical paths stay on RelNet Console', () => {
  assert.equal(canonicalConsoleUrl('https://app.relead.com.mx/admin').toString(), `${CANONICAL_CONSOLE_ORIGIN}/console/?area=admin`);
  assert.equal(canonicalConsoleUrl('https://app.relead.com.mx/admin/login').toString(), `${CANONICAL_CONSOLE_ORIGIN}/console/login?area=admin`);
  assert.equal(canonicalConsoleUrl('https://app.relead.com.mx/admin/static/app.js').toString(), `${CANONICAL_CONSOLE_ORIGIN}/console/static/app.js`);
});

test('UI upstream defaults to actual control-web alias and cannot equal incoming console origin', () => {
  assert.equal(normalizeUiOrigin(), DEFAULT_CONSOLE_UI_ORIGIN);
  assert.equal(normalizeUiOrigin('https://admin.relead.com.mx/path'), DEFAULT_CONSOLE_UI_ORIGIN);
  assert.throws(() => normalizeUiOrigin('http://admin.relead.com.mx'), /HTTPS/);
  assert.throws(() => assertDistinctUiOrigin(CANONICAL_CONSOLE_ORIGIN, CANONICAL_CONSOLE_ORIGIN), /cannot equal/);
  assert.doesNotThrow(() => assertDistinctUiOrigin(CANONICAL_CONSOLE_ORIGIN, DEFAULT_CONSOLE_UI_ORIGIN));
});

test('UI Location headers are rewritten back to canonical console host only for UI upstream', () => {
  assert.equal(
    rewriteUiLocation('https://admin.relead.com.mx/console/login?next=%2Fbilling', CANONICAL_CONSOLE_ORIGIN, DEFAULT_CONSOLE_UI_ORIGIN),
    'https://console.relead.com.mx/console/login?next=%2Fbilling'
  );
  assert.equal(
    rewriteUiLocation('/security/otp', CANONICAL_CONSOLE_ORIGIN, DEFAULT_CONSOLE_UI_ORIGIN),
    'https://console.relead.com.mx/security/otp'
  );
  assert.equal(
    rewriteUiLocation('https://accounts.google.com/o/oauth2/v2/auth', CANONICAL_CONSOLE_ORIGIN, DEFAULT_CONSOLE_UI_ORIGIN),
    'https://accounts.google.com/o/oauth2/v2/auth'
  );
});

test('backend origin requires HTTPS', () => {
  assert.equal(normalizeOrigin('https://api.relead.com.mx/x'), 'https://api.relead.com.mx');
  assert.throws(() => normalizeOrigin('http://api.relead.com.mx'), /HTTPS/);
});
