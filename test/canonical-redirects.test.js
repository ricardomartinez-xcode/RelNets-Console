import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalTarget } from '../src/index.js';

test('console-domain root canonicalizes locally instead of redirecting to itself by hostname', () => {
  const target = canonicalTarget(new URL('https://console.relead.com.mx/'));
  assert.equal(target.toString(), 'https://console.relead.com.mx/console/');
});

test('legacy admin UI canonicalizes inside the same console hostname', () => {
  const target = canonicalTarget(new URL('https://console.relead.com.mx/admin/rescue'));
  assert.equal(target.origin, 'https://console.relead.com.mx');
  assert.equal(target.pathname, '/console/');
  assert.equal(target.searchParams.get('area'), 'admin');
});

test('console UI routes remain on the canonical host', () => {
  const target = canonicalTarget(new URL('https://console.relead.com.mx/security/otp?setup=1'));
  assert.equal(target.toString(), 'https://console.relead.com.mx/console/?setup=1');
});

test('unknown API paths are never converted into graphical redirects', () => {
  assert.equal(canonicalTarget(new URL('https://console.relead.com.mx/api/private')), null);
});
