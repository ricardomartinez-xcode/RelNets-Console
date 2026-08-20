import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import worker from '../src/index.js';
import { RELNET_NEXT_ROUTES, UI_STATES } from '../src/relnet-ui.js';
import { BACKEND_DEPENDENCIES } from '../src/relnet-api.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const request = (path) => new Request(`https://console.relead.com.mx${path}`, { headers: { accept: 'text/html' } });

test('RelNet Next console route map is served locally, not proxied as legacy UI', async () => {
  const expected = ['/console/relnet','/console/relnet/controllers','/console/relnet/nodes','/console/relnet/edge','/console/relnet/network','/console/relnet/installation','/console/relnet/diagnostics','/console/relnet/migration','/console/relnet/ai'];
  assert.deepEqual(RELNET_NEXT_ROUTES, expected);
  for (const route of expected) {
    const response = await worker.fetch(request(route), {});
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get('content-type') || '', /text\/html/);
    assert.equal(response.headers.get('x-relead-surface'), 'relnet-next-console');
  }
});

test('console contains every required operational surface without fabricated live values', async () => {
  const response = await worker.fetch(request('/console/relnet'), {});
  const html = await response.text();
  for (const label of ['Fleet','Controllers','Nodes','Edge','Network','Installation','Diagnostics','Migration','AI-Coordinator']) assert.match(html, new RegExp(label, 'i'));
  for (const term of ['topology generation','active-active','NetworkMap','Control Stream','Service Stream','RelDrop','RelShare','rollback','GGUF']) assert.match(html, new RegExp(term, 'i'));
  assert.match(html, /Backend dependency|Backend pendiente/i);
  assert.doesNotMatch(html, /100% healthy|all systems operational|migration complete/i);
});

test('mandatory UI states are explicit and retry is accessible', async () => {
  assert.deepEqual(UI_STATES, ['loading','empty','offline','partial','degraded','blocked','error','retry','permission-denied','unsupported']);
  const response = await worker.fetch(request('/console/relnet/diagnostics'), {});
  const html = await response.text();
  for (const state of UI_STATES) assert.match(html, new RegExp(`data-ui-state=["']${state}["']`));
  assert.match(html, /aria-live=["']polite["']/);
  assert.match(html, /<button[^>]+data-retry/);
});

test('typed API contract and backend dependency matrix exist and remain fail-closed', () => {
  assert.equal(existsSync(new URL('../types/relnet-api.ts', import.meta.url)), true);
  const typed = read('types/relnet-api.ts');
  for (const name of ['FleetSnapshot','ControllerSnapshot','NodeSnapshot','EdgeServiceSnapshot','InstallationSnapshot','DiagnosticsSnapshot','MigrationSnapshot','AiCoordinatorSnapshot']) assert.match(typed, new RegExp(`interface ${name}`));
  assert.ok(BACKEND_DEPENDENCIES.length >= 8);
  for (const dep of BACKEND_DEPENDENCIES) {
    assert.equal(dep.available, false, dep.id);
    assert.match(dep.status, /backend-pending/);
  }
});

test('AI Coordinator inventory is factual but runtime status is not invented', async () => {
  const html = await (await worker.fetch(request('/console/relnet/ai'), {})).text();
  for (const fact of ['AI-Coordinator','100.65.98.26','Ubuntu 26.04','x86_64','4 vCPU','7.6 GiB','~70 GiB','NVIDIA: none']) assert.match(html, new RegExp(fact.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  for (const field of ['worker status','assigned jobs','model status','tokens/sec','readiness','error state']) assert.match(html, new RegExp(field, 'i'));
  assert.match(html, /sin endpoint|backend pendiente/i);
});

test('migration UI exposes rollback and cutover but never legacy deletion', async () => {
  const html = await (await worker.fetch(request('/console/relnet/migration'), {})).text();
  for (const term of ['Legacy RelNet','RelNet Next','blockers','rollback','cutover']) assert.match(html, new RegExp(term, 'i'));
  assert.doesNotMatch(html, /delete legacy|eliminar legacy|remove legacy/i);
});

test('responsive and basic accessibility contracts are present', async () => {
  const html = await (await worker.fetch(request('/console/relnet/nodes'), {})).text();
  assert.match(html, /<main[^>]+id=["']main-content["']/);
  assert.match(html, /aria-label=["']RelNet Next navigation["']/);
  assert.match(html, /href=["']#main-content["']/);
  assert.match(html, /aria-current=["']page["']/);
  const css = read('src/relnet-ui.css');
  assert.match(css, /@media\s*\(max-width:\s*960px\)/);
  assert.match(css, /@media\s*\(max-width:\s*640px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});

test('deprecated app hostname is absent from runtime and new console contracts', () => {
  for (const file of ['src/index.js','src/policy.js','src/relnet-ui.js','src/relnet-api.js','types/relnet-api.ts']) {
    if (existsSync(new URL(`../${file}`, import.meta.url))) assert.doesNotMatch(read(file), /app\.relead\.com\.mx/);
  }
});
