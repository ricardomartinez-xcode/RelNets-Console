import test from 'node:test';
import assert from 'node:assert/strict';
import middleware, { config } from '../middleware.js';

test('Vercel adapter sends unauthenticated Console routes through the central Auth Gateway', async()=>{
  assert.equal(config.runtime,'nodejs');
  const response=await middleware(new Request('https://preview.example/billing'));
  assert.equal(response.status,302);
  assert.equal(response.headers.get('location'),'https://auth.relnets.com/access');
  assert.equal(response.headers.get('cache-control'),'no-store');
});
