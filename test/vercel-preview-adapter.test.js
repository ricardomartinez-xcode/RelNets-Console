import test from 'node:test';
import assert from 'node:assert/strict';
import middleware, { config } from '../middleware.js';

test('Vercel adapter delegates product Console routes to the same fail-closed Worker', async()=>{
  assert.equal(config.runtime,'nodejs');
  const response=await middleware(new Request('https://preview.example/billing'));
  assert.equal(response.status,200);
  assert.equal(response.headers.get('x-relead-surface'),'relnet-next-console');
  const html=await response.text();
  assert.match(html,/Backend pendiente/);
});
