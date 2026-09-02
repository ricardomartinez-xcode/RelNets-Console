import test from 'node:test';
import assert from 'node:assert/strict';
import middleware, { readinessTarget } from '../middleware.js';

test('readyz bypasses the OAuth gate and mirrors Identity readiness', async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = '';
  try {
    globalThis.fetch = async (input, init) => {
      seenUrl = String(input);
      assert.equal(init?.method, 'GET');
      assert.equal(init?.redirect, 'manual');
      assert.deepEqual(init?.headers, { accept: 'application/json' });
      return Response.json({ status: 'not_ready' }, { status: 503 });
    };

    const response = await middleware(new Request('https://console.relnets.com/readyz'));
    assert.equal(seenUrl, 'https://api.console.relnets.com/readyz');
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(await response.text(), '{"status":"not_ready"}');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('only readyz uses the readiness bypass', () => {
  assert.equal(
    readinessTarget(new Request('https://console.relnets.com/readyz?probe=1')).toString(),
    'https://api.console.relnets.com/readyz?probe=1',
  );
  assert.equal(readinessTarget(new Request('https://console.relnets.com/dashboard')), null);
});
