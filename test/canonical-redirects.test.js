import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalTarget } from '../src/index.js';

test('legacy console paths redirect to canonical console host', () => {
  const target = canonicalTarget(new URL('https://app.relead.com.mx/console/nodes?tab=online'));
  assert.equal(target.toString(), 'https://console.relead.com.mx/console/nodes?tab=online');
});

test('legacy admin paths redirect to canonical console host', () => {
  const target = canonicalTarget(new URL('https://app.relead.com.mx/admin/rescue'));
  assert.equal(target.toString(), 'https://console.relead.com.mx/admin/rescue');
});

test('legacy login becomes console login', () => {
  const target = canonicalTarget(new URL('https://app.relead.com.mx/login?next=%2Fconsole%2F'));
  assert.equal(target.toString(), 'https://console.relead.com.mx/console/login?next=%2Fconsole%2F');
});

test('root returns public site target and unknown paths do not proxy API', () => {
  assert.equal(canonicalTarget(new URL('https://app.relead.com.mx/')).toString(), 'https://relead.com.mx/');
  assert.equal(canonicalTarget(new URL('https://app.relead.com.mx/api/private')), null);
});
