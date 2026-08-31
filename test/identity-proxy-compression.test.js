import test from 'node:test';
import assert from 'node:assert/strict';
import middleware from '../middleware.js';

test('Console identity proxy removes compressed upstream length before Vercel serialization', async () => {
  const originalFetch = globalThis.fetch;
  const payload = JSON.stringify({
    issuer: 'https://console.relnets.com',
    authorization_endpoint: 'https://console.relnets.com/oauth/authorize',
    token_endpoint: 'https://console.relnets.com/oauth/token',
    jwks_uri: 'https://console.relnets.com/.well-known/jwks.json',
    marker: 'x'.repeat(700),
  });

  globalThis.fetch = async () => new Response(payload, {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'content-encoding': 'gzip',
      'content-length': '352',
      'transfer-encoding': 'chunked',
    },
  });

  try {
    const response = await middleware(new Request('https://console.relnets.com/.well-known/openid-configuration'));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-length'), null);
    assert.equal(response.headers.get('content-encoding'), null);
    assert.equal(response.headers.get('transfer-encoding'), null);
    assert.equal(await response.text(), payload);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
