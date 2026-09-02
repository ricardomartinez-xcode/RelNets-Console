import test from 'node:test';
import assert from 'node:assert/strict';
import middleware, { classifyReadiness, readinessTarget } from '../middleware.js';

test('readyz reports core-ready when only legacy auth and pending billing are degraded', async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = '';
  try {
    globalThis.fetch = async (input, init) => {
      seenUrl = String(input);
      assert.equal(init?.method, 'GET');
      assert.equal(init?.redirect, 'manual');
      assert.deepEqual(init?.headers, { accept: 'application/json' });
      return Response.json({
        status: 'not_ready',
        auth: false,
        database: true,
        scheduler: true,
        billing: false,
        identity: true,
      }, { status: 503 });
    };

    const response = await middleware(new Request('https://console.relnets.com/readyz'));
    assert.equal(seenUrl, 'https://api.console.relnets.com/readyz');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-relnets-readiness'), 'core-ready-degraded');
    const body = await response.json();
    assert.equal(body.status, 'ready');
    assert.equal(body.upstream_status, 'not_ready');
    assert.deepEqual(body.degraded, ['auth', 'billing']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('readyz preserves 503 when any core dependency is not ready', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({
      status: 'not_ready',
      auth: false,
      database: false,
      scheduler: true,
      billing: false,
      identity: true,
    }, { status: 503 });

    const response = await middleware(new Request('https://console.relnets.com/readyz'));
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.database, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('HEAD readyz uses the same upstream classification without a response body', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (_input, init) => {
      assert.equal(init?.method, 'GET');
      return Response.json({
        status: 'not_ready',
        auth: false,
        database: true,
        scheduler: true,
        billing: false,
        identity: true,
      }, { status: 503 });
    };

    const response = await middleware(new Request('https://console.relnets.com/readyz', { method: 'HEAD' }));
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('readiness classification only treats database, scheduler and identity as core', () => {
  assert.deepEqual(classifyReadiness({ database: true, scheduler: true, identity: true, auth: false, billing: false }), {
    coreReady: true,
    degraded: ['auth', 'billing'],
  });
  assert.deepEqual(classifyReadiness({ database: true, scheduler: false, identity: true, auth: true, billing: true }), {
    coreReady: false,
    degraded: [],
  });
});

test('only readyz uses the readiness bypass', () => {
  assert.equal(
    readinessTarget(new Request('https://console.relnets.com/readyz?probe=1')).toString(),
    'https://api.console.relnets.com/readyz?probe=1',
  );
  assert.equal(readinessTarget(new Request('https://console.relnets.com/dashboard')), null);
});
