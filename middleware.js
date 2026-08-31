import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import process from 'node:process';
import worker from './src/index.js';

export const CONSOLE_ORIGIN = 'https://console.relnets.com';
export const IDENTITY_API_ORIGIN = 'https://api.console.relnets.com';
const AUTH_ISSUER = CONSOLE_ORIGIN;
const AUTHORIZE_URL = `${CONSOLE_ORIGIN}/oauth/authorize`;
const TOKEN_URL = `${IDENTITY_API_ORIGIN}/oauth/token`;
const USERINFO_URL = `${IDENTITY_API_ORIGIN}/oauth/userinfo`;
const CLIENT_ID = 'relead-console';
const REDIRECT_URI = `${CONSOLE_ORIGIN}/auth/callback`;

export const USER_API_RESOURCE = 'https://console.relnets.com/v2';
export const USER_MCP_RESOURCE = 'https://console.relnets.com/mcp';

const UI_SCOPE_LIST = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'relnet.profile.read',
  'relnet.nodes.read',
  'relnet.nodes.enroll',
  'relnet.nodes.manage',
  'relnet.network.read',
  'relnet.network.manage',
  'relnet.ssh.execute',
  'billing.read',
  'billing.write',
];
const UI_SCOPES = UI_SCOPE_LIST.join(' ');

const PKCE_COOKIE = '__Host-relead_console_pkce';
const STATE_COOKIE = '__Host-relead_console_state';
const RETURN_COOKIE = '__Host-relead_console_return_to';
const ACCESS_TOKEN_COOKIE = '__Host-relead_console_at';
const REFRESH_TOKEN_COOKIE = '__Host-relead_console_rt';
const IDENTITY_SESSION_COOKIE = '__Host-relnets_console_session';
const IDENTITY_CSRF_COOKIE = '__Host-relnets_console_csrf';

const PUBLIC_IDENTITY_PATHS = new Set([
  '/.well-known/openid-configuration',
  '/.well-known/jwks.json',
  '/oauth/jwks',
  '/oauth/authorize',
  '/oauth/token',
  '/oauth/userinfo',
  '/oauth/revoke',
  '/oauth/session',
  '/login',
  '/signup',
]);

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
  for (const value of cookies) headers.append('set-cookie', value);
  return new Response(null, { status, headers });
}

export function safeReturnTo(value) {
  const raw = String(value || '').trim();
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
  let parsed;
  try {
    parsed = new URL(raw, CONSOLE_ORIGIN);
  } catch {
    return '/dashboard';
  }
  if (parsed.origin !== CONSOLE_ORIGIN) return '/dashboard';
  if (parsed.pathname !== '/dashboard' && !parsed.pathname.startsWith('/dashboard/')) return '/dashboard';
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function parseBillingIntent(value) {
  const url = value instanceof URL ? value : new URL(String(value), CONSOLE_ORIGIN);
  if (url.pathname !== '/dashboard/billing') return null;
  if (url.searchParams.get('intent') !== 'checkout') return null;
  const plan = url.searchParams.get('plan');
  const interval = url.searchParams.get('interval');
  if (!['pro', 'team'].includes(plan)) return null;
  if (!['month', 'year'].includes(interval)) return null;
  return { plan, interval };
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
    authorization_servers: [CONSOLE_ORIGIN],
    scopes_supported: scopes,
    bearer_methods_supported: ['header'],
  };
}

function metadataResponse(resource, scopes) {
  return Response.json(resourceMetadata(resource, scopes), {
    headers: { 'cache-control': 'public, max-age=300' },
  });
}

function unauthorized(metadataPath, scope = 'relnet.profile.read') {
  return Response.json({ error: 'authorization_required' }, {
    status: 401,
    headers: {
      'cache-control': 'no-store',
      'www-authenticate': `Bearer resource_metadata="${CONSOLE_ORIGIN}${metadataPath}", scope="${scope}"`,
    },
  });
}

function rewriteIdentityLocation(location) {
  if (!location) return null;
  try {
    const resolved = new URL(location, `${IDENTITY_API_ORIGIN}/`);
    if (resolved.origin === IDENTITY_API_ORIGIN) {
      return `${CONSOLE_ORIGIN}${resolved.pathname}${resolved.search}${resolved.hash}`;
    }
  } catch {}
  return location;
}

async function proxyIdentity(request) {
  const incoming = new URL(request.url);
  const target = new URL(`${incoming.pathname}${incoming.search}`, `${IDENTITY_API_ORIGIN}/`);
  const headers = new Headers(request.headers);
  headers.delete('host');
  const upstream = await fetch(new Request(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  }));
  const out = new Headers(upstream.headers);
  const location = rewriteIdentityLocation(out.get('location'));
  if (location) out.set('location', location);
  out.set('cache-control', upstream.status >= 300 && upstream.status < 400 ? 'no-store' : (out.get('cache-control') || 'no-store'));
  out.set('x-content-type-options', 'nosniff');
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: out,
  });
}

async function startOAuth(request) {
  const url = new URL(request.url);
  const state = randomToken(24);
  const verifier = randomToken(48);
  const returnTo = safeReturnTo(url.searchParams.get('return_to'));
  return redirect(buildAuthorizeUrl(state, verifier).toString(), 302, [
    secureCookie(STATE_COOKIE, state, 600),
    secureCookie(PKCE_COOKIE, verifier, 600),
    secureCookie(RETURN_COOKIE, encodeURIComponent(returnTo), 600),
  ]);
}

async function finishOAuth(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookies = request.headers.get('cookie');
  const expectedState = cookieValue(cookies, STATE_COOKIE);
  const verifier = cookieValue(cookies, PKCE_COOKIE);
  const encodedReturn = cookieValue(cookies, RETURN_COOKIE);
  const clear = [clearCookie(STATE_COOKIE), clearCookie(PKCE_COOKIE), clearCookie(RETURN_COOKIE)];
  const returnTo = safeReturnTo(encodedReturn ? decodeURIComponent(encodedReturn) : '/dashboard');

  if (!code || !state || !expectedState || !verifier || !safeEqual(state, expectedState)) {
    return redirect(`/auth/start?return_to=${encodeURIComponent(returnTo)}`, 303, clear);
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  });
  let response;
  try {
    response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body,
      redirect: 'manual',
    });
  } catch {
    return redirect(`/auth/start?return_to=${encodeURIComponent(returnTo)}`, 303, clear);
  }
  if (!response.ok) return redirect(`/auth/start?return_to=${encodeURIComponent(returnTo)}`, 303, clear);

  const payload = await response.json();
  const accessToken = typeof payload?.access_token === 'string' ? payload.access_token : '';
  if (!accessToken) return redirect(`/auth/start?return_to=${encodeURIComponent(returnTo)}`, 303, clear);
  const expiresIn = Number.isFinite(Number(payload.expires_in)) ? Math.max(60, Math.min(900, Number(payload.expires_in))) : 900;
  const set = [...clear, secureCookie(ACCESS_TOKEN_COOKIE, accessToken, Math.max(30, expiresIn - 30))];
  if (typeof payload.refresh_token === 'string' && payload.refresh_token) {
    set.push(secureCookie(REFRESH_TOKEN_COOKIE, payload.refresh_token, 30 * 86400));
  }
  return redirect(`${CONSOLE_ORIGIN}${returnTo}`, 303, set);
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

function workerEnv() {
  const env = {};
  if (process.env.BACKEND_ORIGIN) env.BACKEND_ORIGIN = process.env.BACKEND_ORIGIN;
  if (process.env.CONSOLE_UI_ORIGIN) env.CONSOLE_UI_ORIGIN = process.env.CONSOLE_UI_ORIGIN;
  return env;
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
    return Response.json({ error: 'northbound_configuration_invalid' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
  if (!target) return Response.json({ error: 'relnet_northbound_pending' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  const headers = new Headers(request.headers);
  headers.delete('cookie');
  headers.delete('host');
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
    return Response.json({ error: 'relnet_northbound_unavailable' }, { status: 502, headers: { 'cache-control': 'no-store' } });
  }
}

async function startBillingCheckout(request, bearer, intent) {
  let origin;
  try {
    origin = normalizeNorthboundOrigin(process.env.RELNET_NORTHBOUND_ORIGIN);
  } catch {
    return redirect('/dashboard/billing?billing=configuration_error', 303);
  }
  if (!origin) return redirect('/dashboard/billing?billing=unavailable', 303);
  const target = new URL('/v2/billing/checkout', `${origin}/`);
  let response;
  try {
    response = await fetch(target, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${bearer}`,
        'content-type': 'application/json',
        accept: 'application/json',
        'x-relead-proxy-surface': 'billing-intent',
      },
      body: JSON.stringify({ plan_slug: intent.plan, billing_interval: intent.interval }),
      redirect: 'manual',
    });
  } catch {
    return redirect('/dashboard/billing?billing=unavailable', 303);
  }
  if (response.status === 401) {
    return redirect(`/auth/start?return_to=${encodeURIComponent(new URL(request.url).pathname + new URL(request.url).search)}`, 303, [clearCookie(ACCESS_TOKEN_COOKIE)]);
  }
  if (!response.ok) return redirect(`/dashboard/billing?billing=checkout_error&status=${response.status}`, 303);
  let payload;
  try { payload = await response.json(); } catch { return redirect('/dashboard/billing?billing=checkout_error', 303); }
  const checkoutUrl = typeof payload?.url === 'string' ? payload.url : '';
  if (!checkoutUrl.startsWith('https://checkout.stripe.com/')) return redirect('/dashboard/billing?billing=checkout_error', 303);
  return redirect(checkoutUrl, 303);
}

async function logout(request) {
  try {
    await proxyIdentity(new Request(new URL('/logout', IDENTITY_API_ORIGIN), {
      method: 'POST',
      headers: { cookie: request.headers.get('cookie') || '' },
      redirect: 'manual',
    }));
  } catch {}
  return redirect('/login', 303, [
    clearCookie(ACCESS_TOKEN_COOKIE),
    clearCookie(REFRESH_TOKEN_COOKIE),
    clearCookie(IDENTITY_SESSION_COOKIE),
    clearCookie(IDENTITY_CSRF_COOKIE),
  ]);
}

export default async function middleware(request) {
  const canonical = canonicalizeHost(request);
  if (canonical) return canonical;
  const legacy = legacyConsoleRoute(request);
  if (legacy) return legacy;

  const url = new URL(request.url);
  if (PUBLIC_IDENTITY_PATHS.has(url.pathname)) return proxyIdentity(request);
  if (url.pathname === '/logout') return logout(request);
  if (url.pathname === '/auth/start') return startOAuth(request);
  if (url.pathname === '/auth/callback') return finishOAuth(request);

  if (url.pathname === '/.well-known/oauth-protected-resource/v2') {
    return metadataResponse(USER_API_RESOURCE, UI_SCOPE_LIST);
  }
  if (url.pathname === '/.well-known/oauth-protected-resource/mcp') {
    return metadataResponse(USER_MCP_RESOURCE, UI_SCOPE_LIST.filter((scope) => scope !== 'offline_access'));
  }

  if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
    const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') || '');
    if (!match) return unauthorized('/.well-known/oauth-protected-resource/mcp', 'relnet.profile.read');
    return proxyNorthbound(request, match[1], 'mcp');
  }

  const browserToken = cookieValue(request.headers.get('cookie'), ACCESS_TOKEN_COOKIE);

  if (url.pathname === '/v2' || url.pathname.startsWith('/v2/')) {
    const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') || '');
    const bearer = match?.[1] || browserToken;
    if (!bearer) return unauthorized('/.well-known/oauth-protected-resource/v2', 'relnet.profile.read');
    return proxyNorthbound(request, bearer, 'api-v2');
  }

  if (url.pathname === '/healthz') return worker.fetch(request, workerEnv());

  if (!browserToken || !(await validBrowserToken(browserToken))) {
    const clear = browserToken ? [clearCookie(ACCESS_TOKEN_COOKIE), clearCookie(REFRESH_TOKEN_COOKIE)] : [];
    const returnTo = safeReturnTo(`${url.pathname}${url.search}`);
    return redirect(`/auth/start?return_to=${encodeURIComponent(returnTo)}`, 302, clear);
  }

  const billingIntent = parseBillingIntent(url);
  if (billingIntent) return startBillingCheckout(request, browserToken, billingIntent);

  if (url.pathname === '/') return redirect('/dashboard', 302);
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
    return Response.json({ detail: 'Not found' }, { status: 404, headers: { 'cache-control': 'no-store' } });
  }
  if (url.pathname === '/dashboard' || url.pathname.startsWith('/dashboard/')) {
    const internalPath = '/console' + url.pathname.slice('/dashboard'.length);
    return worker.fetch(internalRequest(request, internalPath || '/console/', browserToken), workerEnv());
  }

  return redirect('/dashboard', 302);
}
