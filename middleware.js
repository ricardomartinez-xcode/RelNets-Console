import originalMiddleware, { IDENTITY_API_ORIGIN, safeReturnTo } from './middleware-impl.js';
export * from './middleware-impl.js';

export const config = { runtime: 'nodejs' };

const ACCESS_COOKIE = '__Host-relead_console_at';
const LEGACY_ACCOUNT_URL = 'https://auth.relnets.com/access';
const LOCAL_ACCOUNT_URL = '/dashboard/access';
const CORE_READINESS_KEYS = ['database', 'scheduler', 'identity'];
const OPTIONAL_READINESS_KEYS = ['auth', 'billing'];

function isIdentityPath(pathname) {
  return pathname === '/login'
    || pathname === '/signup'
    || pathname === '/logout'
    || pathname.startsWith('/oauth/')
    || pathname.startsWith('/.well-known/');
}

function hasCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  return header.split(';').some((part) => part.trim().startsWith(`${name}=`));
}

function clearEncodingHeaders(headers) {
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('transfer-encoding');
}

export function readinessTarget(request) {
  const incoming = new URL(request.url);
  if (incoming.pathname !== '/readyz') return null;
  return new URL(`/readyz${incoming.search}`, `${IDENTITY_API_ORIGIN}/`);
}

export function classifyReadiness(payload) {
  if (!payload || typeof payload !== 'object') {
    return { coreReady: false, degraded: [] };
  }
  const coreReady = CORE_READINESS_KEYS.every((key) => payload[key] === true);
  const degraded = OPTIONAL_READINESS_KEYS.filter((key) => payload[key] !== true);
  return { coreReady, degraded };
}

export async function proxyReadiness(request) {
  const target = readinessTarget(request);
  if (!target) return null;

  try {
    const clientMethod = request.method === 'HEAD' ? 'HEAD' : 'GET';
    // Always GET upstream so HEAD callers receive the same readiness status
    // classification without requiring the upstream to implement HEAD semantics.
    const upstream = await fetch(target, {
      method: 'GET',
      headers: { accept: 'application/json' },
      redirect: 'manual',
    });
    const headers = new Headers(upstream.headers);
    clearEncodingHeaders(headers);
    headers.set('cache-control', 'no-store');
    headers.set('x-content-type-options', 'nosniff');

    if (upstream.status === 503) {
      const payload = await upstream.clone().json().catch(() => null);
      const { coreReady, degraded } = classifyReadiness(payload);
      if (coreReady) {
        headers.set('content-type', 'application/json; charset=utf-8');
        headers.set('x-relnets-readiness', 'core-ready-degraded');
        const body = JSON.stringify({
          ...payload,
          status: 'ready',
          degraded,
          upstream_status: payload?.status || 'not_ready',
        });
        return new Response(clientMethod === 'HEAD' ? null : body, {
          status: 200,
          headers,
        });
      }
    }

    return new Response(clientMethod === 'HEAD' ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch {
    return Response.json({ error: 'identity_readiness_unavailable' }, {
      status: 502,
      headers: {
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      },
    });
  }
}

export function guardAuthLoop(request, response) {
  if (response.status < 300 || response.status >= 400) return response;
  const location = response.headers.get('location');
  if (!location) return response;

  let target;
  try { target = new URL(location, 'https://console.relnets.com'); } catch { return response; }
  if (target.pathname !== '/auth/start') return response;

  const incoming = new URL(request.url);
  const callbackFailed = incoming.pathname === '/auth/callback';
  const staleBrowserToken = hasCookie(request, ACCESS_COOKIE);
  if (!callbackFailed && !staleBrowserToken) return response;

  const returnTo = safeReturnTo(target.searchParams.get('return_to') || '/dashboard');
  const headers = new Headers(response.headers);
  headers.set('location', `/login?oauth_error=1&return_to=${encodeURIComponent(returnTo)}`);
  headers.set('cache-control', 'no-store');
  return new Response(null, { status: 303, headers });
}

export async function rewriteLegacyAccountLink(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('text/html')) return response;

  const html = await response.text();
  if (!html.includes(LEGACY_ACCOUNT_URL)) {
    const headers = new Headers(response.headers);
    clearEncodingHeaders(headers);
    return new Response(html, { status: response.status, statusText: response.statusText, headers });
  }

  const headers = new Headers(response.headers);
  clearEncodingHeaders(headers);
  return new Response(html.split(LEGACY_ACCOUNT_URL).join(LOCAL_ACCOUNT_URL), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function sanitizeProxyResponse(request, response) {
  const pathname = new URL(request.url).pathname;
  if (!isIdentityPath(pathname)) return response;

  const headers = new Headers(response.headers);
  clearEncodingHeaders(headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default async function middleware(request) {
  const readiness = await proxyReadiness(request);
  if (readiness) return readiness;

  let response = await originalMiddleware(request);
  response = guardAuthLoop(request, response);
  response = await rewriteLegacyAccountLink(response);
  return sanitizeProxyResponse(request, response);
}
