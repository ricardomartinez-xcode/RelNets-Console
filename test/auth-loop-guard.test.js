import test from 'node:test';
import assert from 'node:assert/strict';
import { guardAuthLoop, rewriteLegacyAccountLink } from '../middleware.js';

test('failed OAuth callback stops at login instead of restarting auth', () => {
  const request = new Request('https://console.relnets.com/auth/callback?code=bad&state=bad');
  const upstream = new Response(null, { status: 303, headers: { location: '/auth/start?return_to=%2Fdashboard' } });
  const response = guardAuthLoop(request, upstream);
  assert.equal(response.status, 303);
  const location = new URL(response.headers.get('location') || '', 'https://console.relnets.com');
  assert.equal(location.pathname, '/login');
  assert.equal(location.searchParams.get('oauth_error'), '1');
  assert.equal(location.searchParams.get('return_to'), '/dashboard');
});

test('anonymous dashboard can still start OAuth normally', () => {
  const request = new Request('https://console.relnets.com/dashboard');
  const upstream = new Response(null, { status: 302, headers: { location: '/auth/start?return_to=%2Fdashboard' } });
  const response = guardAuthLoop(request, upstream);
  assert.equal(response.headers.get('location'), '/auth/start?return_to=%2Fdashboard');
});

test('stale browser access token does not silently re-authenticate forever', () => {
  const request = new Request('https://console.relnets.com/dashboard', { headers: { cookie: '__Host-relead_console_at=stale' } });
  const upstream = new Response(null, { status: 302, headers: { location: '/auth/start?return_to=%2Fdashboard' } });
  const response = guardAuthLoop(request, upstream);
  assert.match(response.headers.get('location') || '', /^\/login\?oauth_error=1&/);
});

test('legacy Auth account link is rewritten to Console', async () => {
  const response = await rewriteLegacyAccountLink(
    new Response('<a href="https://auth.relnets.com/access">Cuenta</a>', { headers: { 'content-type': 'text/html' } }),
  );
  const html = await response.text();
  assert.doesNotMatch(html, /auth\.relnets\.com\/access/);
  assert.match(html, /\/dashboard\/access/);
});
