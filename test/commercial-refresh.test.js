import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderRelnetConsole } from '../src/relnet-ui.js';

test('billing presents approved RelNets prices and AI allocations', () => {
  const page = renderRelnetConsole('/console/billing');
  assert.match(page, /\$199 MXN\/mes/);
  assert.match(page, /\$1,990 MXN\/año/);
  assert.match(page, /\$499 MXN\/mes/);
  assert.match(page, /\$4,990 MXN\/año/);
  assert.match(page, /1,200.*créditos/i);
  assert.match(page, /5,000.*créditos/i);
  assert.doesNotMatch(page, /\$149 MXN\/mes|\$399 MXN\/mes/);
});

test('billing exposes AI credit top-up packages through backend checkout only', () => {
  const page = renderRelnetConsole('/console/billing');
  const source = readFileSync(new URL('../src/relnet-ui.js', import.meta.url), 'utf8');
  assert.match(page, /500.*\$49 MXN/s);
  assert.match(page, /2,000.*\$149 MXN/s);
  assert.match(page, /10,000.*\$499 MXN/s);
  assert.match(source, /\/v2\/billing\/credits\/checkout/);
  assert.doesNotMatch(page, /buy\.stripe\.com/);
});

test('paid plans are ad-free while Free has an explicit sponsored surface', () => {
  const page = renderRelnetConsole('/console/billing');
  assert.match(page, /Sin anuncios/i);
  assert.match(page, /Patrocinado/i);
  assert.match(page, /data-free-sponsored/);
});

test('user console avoids prohibited internal branding and stale public domains', () => {
  const source = readFileSync(new URL('../src/relnet-ui.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /Builder/);
  assert.doesNotMatch(source, /relead\.com\.mx/);
  assert.match(source, /https:\/\/relnets\.com/);
});
