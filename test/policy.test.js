import test from'node:test';
import assert from'node:assert/strict';
import{CANONICAL_CONSOLE_ORIGIN,canonicalConsoleUrl,isLegacyProxyPath,isPanelPath,normalizeOrigin}from'../src/policy.js';

test('admin and console remain recognized only as legacy panel paths',()=>{
  assert.equal(isPanelPath('/admin'),true);
  assert.equal(isPanelPath('/admin/api/session'),true);
  assert.equal(isPanelPath('/console/share-target'),true);
  assert.equal(isPanelPath('/mcp'),false);
  assert.equal(isPanelPath('/administer'),false);
});

test('only APIs and non-GET legacy auth are proxied',()=>{
  assert.equal(isLegacyProxyPath('/admin/api/session','GET'),true);
  assert.equal(isLegacyProxyPath('/console/api/modules/relnet','POST'),true);
  assert.equal(isLegacyProxyPath('/console/login','GET'),false);
  assert.equal(isLegacyProxyPath('/console/login','POST'),true);
  assert.equal(isLegacyProxyPath('/admin/static/app.js','GET'),false);
});

test('legacy graphical routes canonicalize to RelNet Console',()=>{
  assert.equal(canonicalConsoleUrl('https://app.relead.com.mx/').toString(),`${CANONICAL_CONSOLE_ORIGIN}/console/`);
  assert.equal(canonicalConsoleUrl('https://app.relead.com.mx/console/devices?tag=laptop').toString(),`${CANONICAL_CONSOLE_ORIGIN}/console/devices?tag=laptop`);
  assert.equal(canonicalConsoleUrl('https://app.relead.com.mx/admin').toString(),`${CANONICAL_CONSOLE_ORIGIN}/console/?area=admin`);
  assert.equal(canonicalConsoleUrl('https://app.relead.com.mx/admin/static/app.js').toString(),`${CANONICAL_CONSOLE_ORIGIN}/console/static/app.js`);
  assert.equal(canonicalConsoleUrl('https://app.relead.com.mx/admin/login').toString(),`${CANONICAL_CONSOLE_ORIGIN}/console/login?area=admin`);
});

test('backend origin requires HTTPS',()=>{
  assert.equal(normalizeOrigin('https://api.relead.com.mx/x'),'https://api.relead.com.mx');
  assert.throws(()=>normalizeOrigin('http://api.relead.com.mx'),/HTTPS/);
});
