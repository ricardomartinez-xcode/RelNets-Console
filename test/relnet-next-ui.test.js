import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { RELNET_NEXT_ROUTES, UI_STATES } from '../src/relnet-ui.js';

const request = (path) => new Request(`https://console.relnets.com${path}`, { headers: { accept: 'text/html' } });
const html = async (path) => (await worker.fetch(request(path), {})).text();

test('Console serves only tenant-scoped product routes locally', async () => {
  const expected=['/console','/console/network','/console/nodes','/console/access','/console/billing'];
  assert.deepEqual(RELNET_NEXT_ROUTES, expected);
  for(const route of expected){const response=await worker.fetch(request(route),{});assert.equal(response.status,200);assert.match(response.headers.get('content-type')||'',/text\/html/);assert.equal(response.headers.get('x-relead-surface'),'relnet-next-console');}
});

test('overview exposes user-plane navigation and canonical same-origin data surfaces', async()=>{
  const page=await html('/console');
  for(const label of ['Resumen','Mi red','Mis nodos','Acceso','Billing']) assert.match(page,new RegExp(label,'i'));
  assert.match(page,/data-endpoint=["']\/v2\/me["']/);
  assert.match(page,/data-endpoint=["']\/v2\/network["']/);
  assert.match(page,/data-endpoint=["']\/v2\/nodes["']/);
  assert.doesNotMatch(page,/Controller A|Controller B|Fleet|Migration|global infrastructure/i);
});

test('network, nodes and billing use canonical same-origin v2 surfaces',async()=>{
  assert.match(await html('/console/network'),/data-endpoint=["']\/v2\/network["']/);
  assert.match(await html('/console/nodes'),/data-endpoint=["']\/v2\/nodes["']/);
  assert.match(await html('/console/billing'),/data-endpoint=["']\/v2\/billing\/me["']/);
});

test('access explains identity boundary without internal platform branding',async()=>{
  const page=await html('/console/access');
  assert.match(page,/scope.*ownership.*entitlement.*policy/is);
  assert.match(page,/MCP requiere Bearer explícito/i);
  assert.doesNotMatch(page,/Builder|platform:\*/i);
});

test('mandatory UI states remain explicit and fail closed',async()=>{
  assert.deepEqual(UI_STATES,['loading','empty','offline','partial','degraded','blocked','error','retry','permission-denied','unsupported']);
  const page=await html('/console');
  assert.match(page,/response\.status===503\|\|response\.status===502/);
  assert.match(page,/permission-denied/);
  assert.match(page,/credentials:'same-origin'/);
});

test('Console branding uses relnets.com and accessibility contracts',async()=>{
  const page=await html('/console/nodes');
  assert.match(page,/relnets\.com\/relnet-brand-transparent\.png/);
  assert.match(page,/<main[^>]+id=["']main-content["']/);
  assert.match(page,/aria-label=["']Navegación de RelNets["']/);
  assert.match(page,/href=["']#main-content["']/);
  const cssResponse=await worker.fetch(request('/console/relnet/assets/ui.css'),{});assert.equal(cssResponse.status,200);const css=await cssResponse.text();assert.match(css,/@media\(max-width:960px\)/);assert.match(css,/@media\(max-width:640px\)/);assert.match(css,/:focus-visible/);assert.match(css,/prefers-reduced-motion/);
});
