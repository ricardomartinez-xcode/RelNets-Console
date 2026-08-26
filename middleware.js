import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import process from 'node:process';
import worker from './src/index.js';

const AUTH_ISSUER = 'https://auth.relead.com.mx';
const ACCESS_URL = `${AUTH_ISSUER}/access`;
const AUTHORIZE_URL = `${AUTH_ISSUER}/oauth/authorize`;
const TOKEN_URL = `${AUTH_ISSUER}/oauth/token`;
const USERINFO_URL = `${AUTH_ISSUER}/userinfo`;
const CLIENT_ID = 'relead-console';
const REDIRECT_URI = 'https://console.relead.com.mx/auth/callback';

export const USER_API_RESOURCE = 'https://console.relead.com.mx/v2';
export const USER_MCP_RESOURCE = 'https://console.relead.com.mx/mcp';

const UI_SCOPES = [
  'openid',
  'profile',
  'email',
  'relnet.profile.read',
  'relnet.nodes.read',
  'relnet.nodes.enroll',
  'relnet.nodes.manage',
  'relnet.network.read',
  'relnet.network.manage',
  'relnet.ssh.execute',
].join(' ');

const PKCE_COOKIE = '__Host-relead_console_pkce';
const STATE_COOKIE = '__Host-relead_console_state';
const ACCESS_TOKEN_COOKIE = '__Host-relead_console_at';

export const config = { runtime: 'nodejs' };

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
    'x-content-type-options': 'nosniff',
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
  url.searchParams.set('scope', UI_SCOPES);
  url.searchParams.set('resource', USER_API_RESOURCE);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);
  return url;
}

export function resourceMetadata(resource, scopes) {
  return {
    resource,
    authorization_servers: [AUTH_ISSUER],
    scopes_supported: scopes,
    bearer_methods_supported: ['header'],
  };
}

function metadataResponse(resource, scopes) {
  return Response.json(resourceMetadata(resource, scopes), {
    headers: { 'cache-control': 'public, max-age=300' },
  });
}

function challenge(metadataPath, scope = 'relnet.profile.read') {
  return `Bearer resource_metadata="https://console.relead.com.mx${metadataPath}", scope="${scope}"`;
}

function unauthorized(metadataPath, scope) {
  return Response.json({ error: 'authorization_required' }, {
    status: 401,
    headers: {
      'cache-control': 'no-store',
      'www-authenticate': challenge(metadataPath, scope),
    },
  });
}

async function startOAuth() {
  const state = randomToken(24);
  const verifier = randomToken(48);
  return redirect(buildAuthorizeUrl(state, verifier).toString(), 302, [
    secureCookie(STATE_COOKIE, state, 600),
    secureCookie(PKCE_COOKIE, verifier, 600),
  ]);
}

async function finishOAuth(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookie = request.headers.get('cookie');
  const expectedState = cookieValue(cookie, STATE_COOKIE);
  const verifier = cookieValue(cookie, PKCE_COOKIE);
  const clear = [clearCookie(STATE_COOKIE), clearCookie(PKCE_COOKIE)];

  if (!code || !state || !expectedState || !verifier || !safeEqual(state, expectedState)) {
    return redirect(ACCESS_URL, 303, clear);
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
    resource: USER_API_RESOURCE,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    },
    body,
    redirect: 'manual',
  });

  if (!response.ok) return redirect(ACCESS_URL, 303, clear);

  const payload = await response.json();
  const token = typeof payload?.access_token === 'string' ? payload.access_token : '';
  if (!token) return redirect(ACCESS_URL, 303, clear);

  const expiresIn = Number.isFinite(Number(payload.expires_in))
    ? Math.max(60, Math.min(900, Number(payload.expires_in)))
    : 900;

  return redirect('https://console.relead.com.mx/dashboard', 303, [
    ...clear,
    secureCookie(ACCESS_TOKEN_COOKIE, token, Math.max(30, expiresIn - 30)),
  ]);
}

async function validBrowserToken(token) {
  if (!token) return false;
  try {
    const response = await fetch(USERINFO_URL, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      redirect: 'manual',
    });
    return response.ok;
  } catch {
    return false;
  }
}

function canonicalizeHost(request) {
  const url = new URL(request.url);
  if (url.hostname !== 'app.relead.com.mx') return null;
  url.hostname = 'console.relead.com.mx';
  url.protocol = 'https:';
  url.port = '';
  return redirect(url.toString(), 308);
}

function legacyConsoleRoute(request) {
  const url = new URL(request.url);
  if (url.pathname !== '/console' && !url.pathname.startsWith('/console/')) return null;
  url.pathname = '/dashboard' + url.pathname.slice('/console'.length);
  return redirect(url.toString(), 308);
}

function internalRequest(request, pathname, bearer) {
  const target = new URL(request.url);
  target.pathname = pathname;
  const headers = new Headers(request.headers);
  if (bearer) headers.set('authorization', `Bearer ${bearer}`);
  headers.set('x-relead-authenticated-surface', 'console');
  return new Request(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  });
}

function workerEnv() {
  const env = {};
  if (process.env.BACKEND_ORIGIN) env.BACKEND_ORIGIN = process.env.BACKEND_ORIGIN;
  if (process.env.CONSOLE_UI_ORIGIN) env.CONSOLE_UI_ORIGIN = process.env.CONSOLE_UI_ORIGIN;
  return env;
}

export function normalizeNorthboundOrigin(value = process.env.RELNET_NORTHBOUND_ORIGIN) {
  const raw = value?.trim();
  if (!raw) return null;
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('RELNET_NORTHBOUND_ORIGIN must use HTTPS');
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url.origin;
}

export function buildNorthboundTarget(requestUrl, origin) {
  const incoming = new URL(requestUrl);
  const base = normalizeNorthboundOrigin(origin);
  if (!base) return null;
  return new URL(`${incoming.pathname}${incoming.search}`, `${base}/`);
}

async function proxyNorthbound(request, bearer, surface) {
  let target;
  try {
    target = buildNorthboundTarget(request.url, process.env.RELNET_NORTHBOUND_ORIGIN);
  } catch {
    return Response.json({ error: 'northbound_configuration_invalid' }, {
      status: 503,
      headers: { 'cache-control': 'no-store' },
    });
  }
  if (!target) {
    return Response.json({ error: 'relnet_northbound_pending' }, {
      status: 503,
      headers: { 'cache-control': 'no-store' },
    });
  }

  const headers = new Headers(request.headers);
  headers.delete('cookie');
  headers.set('authorization', `Bearer ${bearer}`);
  headers.set('x-relead-proxy-surface', surface);

  try {
    return await fetch(new Request(target, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
    }));
  } catch {
    return Response.json({ error: 'relnet_northbound_unavailable' }, {
      status: 502,
      headers: { 'cache-control': 'no-store' },
    });
  }
}

export default async function middleware(request) {
  const canonical = canonicalizeHost(request);
  if (canonical) return canonical;

  const legacy = legacyConsoleRoute(request);
  if (legacy) return legacy;

  const url = new URL(request.url);

  if (url.pathname === '/healthz') return worker.fetch(request, workerEnv());
  if (url.pathname === '/auth/start') return startOAuth();
  if (url.pathname === '/auth/callback') return finishOAuth(request);

  if (url.pathname === '/.well-known/oauth-protected-resource/v2') {
    return metadataResponse(USER_API_RESOURCE, UI_SCOPES.split(' '));
  }
  if (url.pathname === '/.well-known/oauth-protected-resource/mcp') {
    return metadataResponse(
      USER_MCP_RESOURCE,
      UI_SCOPES.split(' ').filter((scope) => scope !== 'offline_access'),
    );
  }

  if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
    const header = request.headers.get('authorization') || '';
    const bearer = /^Bearer\s+(\S+)$/i.exec(header)?.[1] || '';
    if (!bearer) {
      return unauthorized('/.well-known/oauth-protected-resource/mcp', 'relnet.profile.read');
    }
    return proxyNorthbound(request, bearer, 'mcp');
  }

  const browserToken = cookieValue(request.headers.get('cookie'), ACCESS_TOKEN_COOKIE);

  if (url.pathname === '/v2' || url.pathname.startsWith('/v2/')) {
    const header = request.headers.get('authorization');
    const bearer = /^Bearer\s+(.+)$/i.exec(header || '')?.[1] || browserToken;
    if (!bearer) {
      return unauthorized('/.well-known/oauth-protected-resource/v2', 'relnet.profile.read');
    }
    return proxyNorthbound(request, bearer, 'api-v2');
  }

  if (!browserToken || !(await validBrowserToken(browserToken))) {
    return redirect(ACCESS_URL, 302, browserToken ? [clearCookie(ACCESS_TOKEN_COOKIE)] : []);
  }

  if (url.pathname === '/') {
    return redirect('https://console.relead.com.mx/dashboard', 302);
  }

  if (url.pathname === '/dashboard' || url.pathname.startsWith('/dashboard/')) {
    const internalPath = '/console' + url.pathname.slice('/dashboard'.length);
    return worker.fetch(internalRequest(request, internalPath || '/console/', browserToken), workerEnv());
  }

  return redirect('https://console.relead.com.mx/dashboard', 302);
}
