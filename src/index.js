import {
  CANONICAL_CONSOLE_ORIGIN,
  assertDistinctUiOrigin,
  canonicalConsoleUrl,
  isBackendProxyPath,
  isConsoleUiPath,
  isPanelPath,
  localCanonicalTarget,
  normalizeOrigin,
  normalizeUiOrigin,
  rewriteUiLocation
} from './policy.js';

const SECURITY_HEADERS = {
  'cache-control': 'no-store',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY'
};

function withSecurity(response) {
  const next = new Response(response.body, response);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) next.headers.set(key, value);
  return next;
}

function redirect(target, status = 308) {
  return withSecurity(new Response(null, { status, headers: { location: target.toString() } }));
}

function upstreamRequest(request, target, incoming, upstreamOrigin, surface) {
  const headers = new Headers(request.headers);
  headers.set('x-forwarded-host', incoming.host);
  headers.set('x-forwarded-proto', 'https');
  headers.set('x-relead-edge-surface', surface);
  if (headers.has('origin')) headers.set('origin', upstreamOrigin);
  if (headers.has('referer')) headers.set('referer', `${upstreamOrigin}${target.pathname}${target.search}`);
  headers.delete('host');
  return new Request(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual'
  });
}

function rewriteBackendLocation(location, backendOrigin, incomingOrigin) {
  if (!location) return null;
  let resolved;
  try {
    resolved = new URL(location, `${backendOrigin}/`);
  } catch {
    return location;
  }
  if (resolved.origin !== backendOrigin) return location;
  if (!isPanelPath(resolved.pathname)) return location;
  return canonicalConsoleUrl(resolved, incomingOrigin).toString();
}

async function proxyBackend(request, env) {
  const incoming = new URL(request.url);
  const backendOrigin = normalizeOrigin(env.BACKEND_ORIGIN);
  let backendPath = incoming.pathname;
  if (backendPath === '/console/auth') backendPath = '/console/login';
  if (backendPath === '/admin/auth') backendPath = '/admin/login';
  const target = new URL(`${backendPath}${incoming.search}`, `${backendOrigin}/`);
  const upstream = await fetch(upstreamRequest(request, target, incoming, backendOrigin, incoming.pathname.startsWith('/admin') ? 'admin-api' : 'console-api'));
  if (upstream.status === 101) return upstream;

  const responseHeaders = new Headers(upstream.headers);
  const location = rewriteBackendLocation(responseHeaders.get('location'), backendOrigin, incoming.origin);
  if (location) responseHeaders.set('location', location);
  responseHeaders.set('cache-control', 'no-store');
  responseHeaders.set('x-relead-edge', 'relead-app-v90-backend-proxy');
  responseHeaders.set('x-content-type-options', 'nosniff');
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  });
}

async function proxyConsoleUi(request, env) {
  const incoming = new URL(request.url);
  const uiOrigin = normalizeUiOrigin(env.CONSOLE_UI_ORIGIN);
  assertDistinctUiOrigin(incoming.origin, uiOrigin);
  const target = new URL(`${incoming.pathname}${incoming.search}`, `${uiOrigin}/`);
  const upstream = await fetch(upstreamRequest(request, target, incoming, uiOrigin, 'console-ui'));
  if (upstream.status === 101) return upstream;

  const responseHeaders = new Headers(upstream.headers);
  const location = rewriteUiLocation(responseHeaders.get('location'), incoming.origin, uiOrigin);
  if (location) responseHeaders.set('location', location);
  responseHeaders.set('cache-control', 'no-store');
  responseHeaders.set('x-relead-edge', 'relead-app-v90-console-proxy');
  responseHeaders.set('x-content-type-options', 'nosniff');
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  });
}

export function canonicalTarget(url) {
  const incoming = url instanceof URL ? url : new URL(String(url));
  if (incoming.pathname === '/') return new URL('/console/', incoming.origin);
  if (incoming.pathname === '/admin' || incoming.pathname === '/admin/' || incoming.pathname.startsWith('/admin/')) {
    return localCanonicalTarget(incoming);
  }
  if (isConsoleUiPath(incoming.pathname)) return localCanonicalTarget(incoming);
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname === '/healthz') {
        return withSecurity(Response.json({
          status: 'ok',
          edge: 'relead-app-v90-console-proxy',
          canonical_console: CANONICAL_CONSOLE_ORIGIN,
          ui_upstream: normalizeUiOrigin(env.CONSOLE_UI_ORIGIN)
        }));
      }

      if (url.pathname === '/') return redirect(new URL('/console/', url), 302);

      // APIs, OAuth/Auth and non-GET legacy login remain backend traffic.
      if (isBackendProxyPath(url.pathname, request.method)) return proxyBackend(request, env);

      // Canonicalize graphical Admin URLs locally, never to another hostname.
      if (['GET', 'HEAD'].includes(request.method) && (url.pathname === '/admin' || url.pathname.startsWith('/admin/'))) {
        return redirect(localCanonicalTarget(url), url.pathname === '/admin/login' ? 302 : 308);
      }

      // The console custom domain currently belongs to this edge project. Proxy the
      // real UI internally instead of redirecting back to console.relead.com.mx.
      if (isConsoleUiPath(url.pathname)) return proxyConsoleUi(request, env);

      return withSecurity(Response.json({
        detail: 'Not found',
        canonical_console: CANONICAL_CONSOLE_ORIGIN
      }, { status: 404 }));
    } catch (error) {
      console.error('relead-app proxy error', error);
      return withSecurity(Response.json({
        detail: 'Console edge unavailable',
        canonical_console: CANONICAL_CONSOLE_ORIGIN
      }, { status: 502 }));
    }
  }
};
