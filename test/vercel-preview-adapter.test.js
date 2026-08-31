import test from 'node:test';
import assert from 'node:assert/strict';
import middleware, { config } from '../middleware.js';

test('Vercel adapter sends unauthenticated billing intent through Console-owned OAuth', async () => {
  assert.equal(config.runtime, 'nodejs');
  const target = '/dashboard/billing?intent=checkout&plan=pro&interval=month';
  const response = await middleware(new Request(`https://preview.example${target}`));
  assert.equal(response.status, 302);
  const location = response.headers.get('location') || '';
  assert.ok(location.startsWith('/auth/start?return_to='));
  const authStart = new URL(location, 'https://preview.example');
  assert.equal(authStart.pathname, '/auth/start');
  assert.equal(authStart.searchParams.get('return_to'), target);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
