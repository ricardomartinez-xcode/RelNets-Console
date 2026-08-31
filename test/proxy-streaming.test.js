import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import middleware from '../middleware.js';

test('identity POST proxy forwards body with Node duplex semantics', async () => {
  const originalFetch = globalThis.fetch;
  let seen = false;
  globalThis.fetch = async (request) => {
    seen = true;
    assert.equal(new URL(request.url).origin, 'https://api.console.relnets.com');
    assert.equal(new URL(request.url).pathname, '/signup');
    assert.equal(await request.text(), 'email=canary%40example.invalid');
    return new Response('ok');
  };
  try {
    const response = await middleware(new Request('https://console.relnets.com/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'email=canary%40example.invalid',
    }));
    assert.equal(response.status, 200);
    assert.equal(seen, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Northbound POST proxy forwards JSON body with Node duplex semantics', async () => {
  const originalFetch = globalThis.fetch;
  const previousOrigin = process.env.RELNET_NORTHBOUND_ORIGIN;
  process.env.RELNET_NORTHBOUND_ORIGIN = 'https://northbound.example';
  let seen = false;
  globalThis.fetch = async (request) => {
    seen = true;
    assert.equal(request.url, 'https://northbound.example/v2/billing/checkout');
    assert.equal(request.headers.get('authorization'), 'Bearer test-token');
    assert.equal(await request.text(), '{"plan_slug":"pro","billing_interval":"month"}');
    return Response.json({ url: 'https://checkout.stripe.com/c/pay/test' });
  };
  try {
    const response = await middleware(new Request('https://console.relnets.com/v2/billing/checkout', {
      method: 'POST',
      headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
      body: '{"plan_slug":"pro","billing_interval":"month"}',
    }));
    assert.equal(response.status, 200);
    assert.equal(seen, true);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousOrigin === undefined) delete process.env.RELNET_NORTHBOUND_ORIGIN;
    else process.env.RELNET_NORTHBOUND_ORIGIN = previousOrigin;
  }
});

test('/billing aliases the canonical billing dashboard', async () => {
  const response = await middleware(new Request('https://console.relnets.com/billing?intent=checkout&plan=team&interval=year'));
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), 'https://console.relnets.com/dashboard/billing?intent=checkout&plan=team&interval=year');
});
