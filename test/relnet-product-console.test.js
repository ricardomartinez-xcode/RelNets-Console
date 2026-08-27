import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { RELNET_NEXT_ROUTES } from '../src/relnet-ui.js';

const req = (path) => new Request(`https://console.relnets.com${path}`, { headers: { accept: 'text/html' } });
const page = async (path) => (await worker.fetch(req(path), {})).text();

test('product Console exposes user routes and no controller-fleet route', () => {
  for (const route of ['/console','/console/network','/console/nodes','/console/access','/console/billing']) {
    assert.ok(RELNET_NEXT_ROUTES.includes(route), route);
  }
  for (const forbidden of ['/console/relnet/controllers','/console/relnet/edge','/console/relnet/migration','/console/relnet/diagnostics']) {
    assert.equal(RELNET_NEXT_ROUTES.includes(forbidden), false, forbidden);
  }
});

test('network surface is tenant-facing and delegates authority to Northbound', async () => {
  const html = await page('/console/network');
  assert.match(html, /Mi red/i);
  assert.match(html, /\/v2\/network/);
  assert.match(html, /Space/i);
  assert.doesNotMatch(html, /Controller A|Controller B|controller fleet|draining/i);
});

test('nodes surface describes enrollment and authorization without infrastructure leakage', async () => {
  const html = await page('/console/nodes');
  assert.match(html, /Mis nodos/i);
  assert.match(html, /\/v2\/nodes/);
  assert.match(html, /scope.*entitlement/is);
  assert.doesNotMatch(html, /Controller [A-D]|Hyperdrive|Builder|rescue|browser administrativo/i);
});

test('access surface keeps platform scopes outside user plane', async () => {
  const html = await page('/console/access');
  assert.match(html, /platform:\*/i);
  assert.match(html, /sólo a Builder|solo a Builder/i);
  assert.match(html, /MCP requiere Bearer explícito/i);
});

test('billing surface never grants capabilities client-side', async () => {
  const html = await page('/console/billing');
  assert.match(html, /\/v2\/billing\/me/);
  assert.match(html, /server-side/i);
  assert.match(html, /UI nunca concede capacidades/i);
  assert.doesNotMatch(html, /RunPod|GGUF|tokens\/sec|provider units/i);
});
