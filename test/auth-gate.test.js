import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAuthorizeUrl, resourceMetadata, USER_API_RESOURCE, USER_MCP_RESOURCE } from '../middleware.js';

test('Console OAuth starts with PKCE and the canonical user API resource', () => {
  const url = buildAuthorizeUrl('state-1', 'verifier-1');
  assert.equal(url.origin, 'https://auth.relnets.com');
  assert.equal(url.pathname, '/oauth/authorize');
  assert.equal(url.searchParams.get('client_id'), 'relead-console');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://console.relnets.com/auth/callback');
  assert.equal(url.searchParams.get('resource'), USER_API_RESOURCE);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.match(url.searchParams.get('scope') || '', /relnet\.nodes\.enroll/);
});

test('Console API and MCP publish distinct OAuth resources', () => {
  assert.equal(USER_API_RESOURCE, 'https://console.relnets.com/v2');
  assert.equal(USER_MCP_RESOURCE, 'https://console.relnets.com/mcp');
  assert.notEqual(USER_API_RESOURCE, USER_MCP_RESOURCE);
  assert.deepEqual(resourceMetadata(USER_API_RESOURCE, ['relnet.profile.read']).authorization_servers, ['https://auth.relnets.com']);
});
