import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import process from 'node:process';
import worker from './src/index.js';

const AUTH_ISSUER = 'https://auth.relead.com.mx';
const ACCESS_URL = `${AUTH_ISSUER}/access`;
const AUTHORIZE_URL = `${AUTH_ISSUER}/oauth/authorize`;
const TOKEN_URL = `${AUTH_ISSUER}/oauth/token`;
const CLIENT_ID = 'relead-console';
const REDIRECT_URI = 'https://console.relead.com.mx/auth/callback';
const RESOURCE = 'https://api.relead.com.mx';
const SCOPES = [
  'openid',
  'profile',
  'email',
  'relnet.profile.read',
  'relnet.nodes.read',
  'relnet.nodes.manage',
  'relnet.network.read',
  'relnet.network.manage',
  'relnet.ssh.execute'
].join(' ');

const PKCE_COOKIE = '__Host-relead_console_pkce';
const STATE_COOKIE = '__Host-relead_console_state';
const ACCESS_TOKEN_COOKIE = '__Host-relead_console_at';

export const config = {
  runtime: 'nodejs'
};

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

function cookieValue(header, name) {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName === name) return rawValue.join('=') || null;
  }
  return null;
}

function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function secureCookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearCookie(name) {
  return `${name}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function redirect(location, status = 302, cookies = []) {
  const headers = new Headers({
    location,
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff'
  });
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  return new Response(null, { status, headers });
}

export function buildAuthorizeUrl(state, verifier) {
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('resource', RESOURCE);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);
  return url;
}

async function startOAuth() {
  const state = randomToken(24);
  const verifier = randomToken(48);
  return redirect(buildAuthorizeUrl(state, verifier).toString(), 302, [
    secureCookie(STATE_COOKIE, state, 600),
    secureCookie(PKCE_COOKIE, verifier, 600)
  ]);
}

async function finishOAuth(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookie = request.headers.get('cookie');
  const expectedState = cookieValue(cookie, STATE_COOKIE);
  const verifier = cookieValue(cookie, PKCE_COOKIE);

  if (!code || !state || !expectedState || !verifier || !safeEqual(state, expectedState)) {
    return redirect(ACCESS_URL, 303, [clearCookie(STATE_COOKIE), clearCookie(PKCE_COOKIE)]);
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier
  });

  const tokenResponse = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json'
    },
    body,
    redirect: 'manual'
  });

  if (!tokenResponse.ok) {
    return redirect(ACCESS_URL, 303, [clearCookie(STATE_COOKIE), clearCookie(PKCE_COOKIE)]);
  }

  const payload = await tokenResponse.json();
  const accessToken = typeof payload?.access_token === 'string' ? payload.access_token : '';
  if (!accessToken) {
    return redirect(ACCESS_URL, 303, [clearCookie(STATE_COOKIE), clearCookie(PKCE_COOKIE)]);
  }

  const expiresIn = Number.isFinite(Number(payload.expires_in))
    ? Math.max(60, Math.min(900, Number(payload.expires_in)))
    : 900;

  return redirect('https://console.relead.com.mx/console/', 303, [
    clearCookie(STATE_COOKIE),
    clearCookie(PKCE_COOKIE),
    secureCookie(ACCESS_TOKEN_COOKIE, accessToken, Math.max(30, expiresIn - 30))
  ]);
}

function canonicalizeHost(request) {
  const url = new URL(request.url);
  if (url.hostname !== 'app.relead.com.mx') return null;
  url.hostname = 'console.relead.com.mx';
  url.protocol = 'https:';
  url.port = '';
  return redirect(url.toString(), 308);
}

function withBearer(request, accessToken) {
  const headers = new Headers(request.headers);
  headers.set('authorization', `Bearer ${accessToken}`);
  headers.set('x-relead-authenticated-surface', 'console');
  return new Request(request, { headers });
}

export default async function middleware(request) {
  const canonical = canonicalizeHost(request);
  if (canonical) return canonical;

  const url = new URL(request.url);
  if (url.pathname === '/healthz') {
    const env = {};
    if (process.env.BACKEND_ORIGIN) env.BACKEND_ORIGIN = process.env.BACKEND_ORIGIN;
    if (process.env.CONSOLE_UI_ORIGIN) env.CONSOLE_UI_ORIGIN = process.env.CONSOLE_UI_ORIGIN;
    return worker.fetch(request, env);
  }

  if (url.pathname === '/auth/start') return startOAuth();
  if (url.pathname === '/auth/callback') return finishOAuth(request);

  const accessToken = cookieValue(request.headers.get('cookie'), ACCESS_TOKEN_COOKIE);
  if (!accessToken) return redirect(ACCESS_URL, 302);

  const env = {};
  if (process.env.BACKEND_ORIGIN) env.BACKEND_ORIGIN = process.env.BACKEND_ORIGIN;
  if (process.env.CONSOLE_UI_ORIGIN% env.CONSOLE_UI_ORIGIN = process.env.CONSOLE_UI_ORIGIN;
  return worker.fetch(withBearer(request, accessToken), env);
}
