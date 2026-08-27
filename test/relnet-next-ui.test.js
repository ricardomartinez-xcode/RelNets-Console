import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../src/index.js';
import { RELNET_NEXT_ROUTES, UI_STATES } from '../src/relnet-ui.js';

const request = (path) => new Request(`https://console.relnets.com${path}`, { headers: { accept: 'text/html' } });
const html = async (path) => (await worker.fetch(request(path), {})).text();
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Console serves only tenant-scoped product routes locally', async () => {
  const expected = ['/console','/console/network','/console/nodes','/console/access','/console/billing'];
  assert.deepEqual(RELNET_NEXT_ROUTES, expected);
  for (const route of expected) {
    const response = await worker.fetch(request(route), {});
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get('content-type') || '', /text\/html/);
    assert.equal(response.headers.get('x-relead-surface'), 'relnet-next-console');
  }
});

test('Overview exposes user-plane navigation and never global fleet administration', async () => {
  const page = await html('/console');
  for (const label of ['Resumen','Mi red','Mis nodos','Acceso','Billing']) {
    assert.match(page, new RegExp(label, 'i'));
  }
  for (const forbidden of ['Controller A','Controller B','Controller C','Controller D','Fleet','Migration','Edge services','global infrastructure']) {
    assert.doesNotMatch(page, new RegExp(forbidden, 'i'));
  }
  assert.match(page, /API \+ MCP.*Northbound/is);
  assert.match(page, /data-endpoint=["']\/v2\/me["']/);
  assert.match(page, /data-endpoint=["']\/v2\/network["']/);
  assert.match(page, /data-endpoint=["']\/v2\/nodes["']/);
});

test('Network, nodes and billing consume canonical same-origin /v2 surfaces', async () => {
  const network = await html('/console/network');
  const nodes = await html('/console/nodes');
  const billing = await html('/console/billing');
  assert.match(network, /data-endpoint=["']\/v2\/network["']/);
  assert.match(nodes, /data-endpoint=["']\/v2\/nodes["']/);
  assert.match(billing, /data-endpoint=["']\/v2\/billing\/me["']/);
  for (const page of [network, nodes, billing]) {
    assert.doesNotMatch(page, /primary controller|secondary controller|platform:write|platform:execute/i);
  }
});

test('Access page states the admin boundary explicitly', async () => {
  const page = await html('/console/access');
  assert.match(page, /platform:\*/i);
  assert.match(page, /Builder/i);
  assert.match(page, /scope.*ownership.*entitlem.*policy/is);
  assert.doesNotMatch(page, /host admin|rescue global|global secrets/i);
});

test('Mandatory UI states remain explicit and fail-closed client code handles Northbound outage', async () => {
  assert.deepEqual(UI_STATES, ['loading','empty','offline','partial','degraded','blocked','error','retry','permission-denied','unsupported']);
  const page = await html('/console');
  assert.match(page, /relnet_northbound|Control Edge Northbound|Northbound/i);
  assert.match(page, /response\.status === 503 \|| response\.status === 502/);
  assert.match(page, /permission-denied/);
  assert.match(page, /credentials:["']same-origin["']/);
});

test('Console branding and responsive accessibility contracts are present', async () => {
  const page = await html('/console/nodes');
  assert.match(page, /relead\.com\.mx\/relnet-brand-transparent\.png/);
  assert.match(page, /<main[>]+id=["']main-content["']/);
  assert.match(page, /aria-label=["'WNavegación de RelNet["']/);
  assert.match(page, /href=["']#main-content["']/);
  const css = read('src/relnet-ui.css');
  assert.match(css, /@media\(max-width:960px\)/);
  assert.match(css, /@media\(max-width:640px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(cs, /prefers-reduced-motion/);
});
