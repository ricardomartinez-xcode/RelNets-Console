import test from 'node:test';
import assert from 'node:assert/strict';
import middleware, {
  buildNorthboundTarget,
  normalizeNorthboundOrigin,
} from '../middleware.js';

test('Northbound origin requires HTTPS and normalizes to origin only', () => {
  assert.equal(
    normalizeNorthboundOrigin('https://northbound.example/internal/path'),
    'https://northbound.example',
  );
  assert.throws(
    () => normalizeNorthboundOrigin('http://northbound.example'),
    /must use HTTPS/,
  );
  assert.equal(normalizeNorthboundOrigin(''), null);
});

test('Northbound target preserves canonical /v2 path and query', () => {
  const target = buildNorthboundTarget(
    'https://console.relnets.com/v2/nodes?limit=20',
    'https://northbound.example',
  );
  assert.equal(
    target.toString(),
    'https://northbound.example/v2/nodes?limit=20',
  );
});

test('MCP requires an explicit bearer and never falls back to dashboard cookie', async () => {
  const response = await middleware(new Request(
    'https://console.relnets.com/mcp',
    { headers: { cookie: '__Host-relead_console_at=browser-token' } },
  ));
  assert.equal(response.status, 401);
  assert.match(
    response.headers.get('www-authenticate') || '',
    /oauth-protected-resource\/mcp/,
  );
});

test('/v2 and /mcp fail closed while Northbound origin is not configured', async () => {
  const previous = process.env.RELNET_NORTHBOUND_ORIGIN;
  delete process.env.RELNET_NORTHBOUND_ORIGIN;
  try {
    const api = await middleware(new Request(
      'https://console.relnets.com/v2/nodes',
      { headers: { authorization: 'Bearer test-token' } },
    ));
    assert.equal(api.status, 503);
    assert.deepEqual(await api.json(), { error: 'relnet_northbound_pending' });

    const mcp = await middleware(new Request(
      'https://console.relnets.com/mcp',
      { headers: { authorization: 'Bearer test-token' } },
    ));
    assert.equal(mcp.status, 503);
    assert.deepEqual(await mcp.json(), { error: 'relnet_northbound_pending' });
  } finally {
    if (previous === undefined) delete process.env.RELNET_NORTHBOUND_ORIGIN;
    else process.env.RELNET_NORTHBOUND_ORIGIN = previous;
  }
});
