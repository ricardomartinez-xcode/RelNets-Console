import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAuthorizeUrl,
  parseBillingIntent,
  resourceMetadata,
  safeReturnTo,
  USER_API_RESOURCE,
} from '../middleware.js';

test('authorize contract uses Console issuer, production callback, PKCE and billing scopes', () => {
  const url = buildAuthorizeUrl('s1', 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_');
  assert.equal(url.origin, 'https://console.relnets.com');
  assert.equal(url.pathname, '/oauth/authorize');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://console.relnets.com/auth/callback');
  assert.equal(url.searchParams.get('resource'), USER_API_RESOURCE);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  const scopes = new Set((url.searchParams.get('scope') || '').split(' '));
  assert.ok(scopes.has('billing.read'));
  assert.ok(scopes.has('billing.write'));
  assert.ok(scopes.has('offline_access'));
});

test('protected-resource metadata points at Console, not legacy auth', () => {
  const metadata = resourceMetadata(USER_API_RESOURCE, ['billing.read']);
  assert.deepEqual(metadata.authorization_servers, ['https://console.relnets.com']);
});

test('safe return preserves internal billing intent and rejects open redirects', () => {
  assert.equal(
    safeReturnTo('/dashboard/billing?intent=checkout&plan=pro&interval=month'),
    '/dashboard/billing?intent=checkout&plan=pro&interval=month',
  );
  assert.equal(safeReturnTo('//evil.example/x'), '/dashboard');
  assert.equal(safeReturnTo('https://evil.example/x'), '/dashboard');
  assert.equal(safeReturnTo('/oauth/authorize'), '/dashboard');
});

test('billing intent is strict and success callback cannot trigger checkout again', () => {
  assert.deepEqual(
    parseBillingIntent('https://console.relnets.com/dashboard/billing?intent=checkout&plan=team&interval=year'),
    { plan: 'team', interval: 'year' },
  );
  assert.equal(parseBillingIntent('https://console.relnets.com/dashboard/billing?intent=checkout&plan=enterprise&interval=year'), null);
  assert.equal(parseBillingIntent('https://console.relnets.com/dashboard/billing?billing=success'), null);
});
