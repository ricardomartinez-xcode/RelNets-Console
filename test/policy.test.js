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
  rewriteUiLocation,
} from '../src/policy.js';

test('compatibility backend paths exclude Builder/admin and local user routes', () => {
  for (const path of ['/console/api/modules/relnet','/api/v1/billing/plans','/relnet/v1/nodes','/install/downloads/linux','/ws/terminal']) {
    assert.equal(isBackendProxyPath(path, 'GET'), true, path);
  }
  assert.equal(isBackendProxyPath('/admin/api/session', 'GET'), false);
  assert.equal(isBackendProxyPath('/console/login', 'POST'), true);
  assert.equal(isBackendProxyPath('/console/login', 'GET'), false);
  for (const path of ['/console','/console/network','/console/nodes','/console/access','/console/billing']) {
    assert.equal(isConsoleUiPath(path), false, path);
  }
  assert.equal(isConsoleUiPath('/register'), true);
  assert.equal(isConsoleUiPath('/security/otp'), true);
});

test('canonical Console URL keeps user paths on console.relead.com.mx', () => {
  assert.equal(canonicalConsoleUrl('https://console.relead.com.mx/console/network').toString(), `${CANONICAL_CONSOLE_ORIGIN}/console/network`);
  assert.equal(canonicalConsoleUrl('https://example.invalid/console/nodes?limit=20').toString(), `${CANONICAL_CONSOLE_ORIGIN}/console/nodes?limit=20`);
});

test('UI compatibility upstream is distinct and HTTPS-only', () => {
  assert.equal(normalizeUiOrigin(), DEFAULT_CONSOLE_UI_ORIGIN);
  assert.equal(normalizeUiOrigin('https://admin.relead.com.mx/path'), DEFAULT_CONSOLE_UI_ORIGIN);
  assert.throws(() => normalizeUiOrigin('http://admin.relead.com.mx'), /HTTPS/);
  assert.throws(() => assertDistinctUiOrigin(CANONICAL_CONSOLE_ORIGIN, CANONICAL_CONSOLE_ORIGIN), /cannot equal/);
  assert.doesNotThrow(() => assertDistinctUiOrigin(CANONICAL_CONSOLE_ORIGIN, DEFAULT_CONSOLE_UI_ORIGIN));
});

test('legacy UI locations are rewritten only from the configured upstream', () => {
  assert.equal(
    rewriteUiLocation('https://admin.relead.com.mx/security/otp?next=%2Fbilling', CANONICAL_CONSOLE_ORIGIN, DEFAULT_CONSOLE_UI_ORIGIN),
    'https://console.relead.com.mx/security/otp?next=%2Fbilling',
  );
  assert.equal(
    rewriteUiLocation('https://accounts.google.com/o/oauth2/v2/auth', CANONICAL_CONSOLE_ORIGIN, DEFAULT_CONSOLE_UI_ORIGIN),
    'https://accounts.google.com/o/oauth2/v2/auth',
  );
});

test('backend compatibility origin requires HTTPS', () => {
  assert.equal(normalizeOrigin('https://api.relead.com.mx/x'), 'https://api.relead.com.mx');
  assert.throws(() => normalizeOrigin('http://api.relead.com.mx'), /HTTPS/);
});
