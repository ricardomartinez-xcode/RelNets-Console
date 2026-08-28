import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalTarget } from '../src/index.js';

test('console-domain root canonicalizes locally', () => {
  const target = canonicalTarget(new URL('https://console.relnets.com/'));
  assert.equal(target.toString(), 'https://console.relnets.com/console/');
});

test('tenant-scoped Console routes stay on the canonical host', () => {
  const target = canonicalTarget(new URL('https://console.relnets.com/console/nodes?limit=20'));
  assert.equal(target.toString(), 'https://console.relnets.com/console/nodes?limit=20');
});

test('Builder/admin paths are never canonicalized into the user Console', () => {
  assert.equal(canonicalTarget(new URL('https://console.relnets.com/admin')), null);
  assert.equal(canonicalTarget(new URL('https://console.relnets.com/admin/rescue')), null);
});

test('unknown API paths are never converted into graphical redirects', () => {
  assert.equal(canonicalTarget(new URL('https://console.relnets.com/api/private')), null);
});
