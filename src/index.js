import {
  CANONICAL_CONSOLE_ORIGIN,
  assertDistinctUiOrigin,
  isBackendProxyPath,
  isConsoleUiPath,
  localCanonicalTarget,
  normalizeOrigin,
  normalizeUiOrigin,
  rewriteUiLocation,
} from './policy.js';
import { isLocalProductConsoleRoute, renderRelnetConsole } from './relnet-ui.js';
import { RELNET_CSS } from './relnet-styles.js';

const SECURITY_HEADERS = {
  'cache-control': 'no-store',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
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
    redirect: 'manual',
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
  return new URL(`${resolved.pathname}${resolved.search}${resolved.hash}`, incomingOrigin).toString();
}

async function proxyBackend(request, env) {
  const incoming = new URL(request.url);
  const backendOrigin = normalizeOrigin(env.BACKEND_ORIGIN);
  const target = new URL(`${incoming.pathname}${incoming.search}`, `${backendOrigin}/`);
  const upstream = await fetch(upstreamRequest(request, target, incoming, backendOrigin, 'console-compat-api'));
  if (upstream.status === 101) return upstream;

  const headers = new Headers(upstream.headers);
  const location = rewriteBackendLocation(headers.get('location'), backendOrigin, incoming.origin);
  if (location) headers.set('location', location);
  headers.set('cache-control', 'no-store');
  headers.set('x-relead-edge', 'relead-app-console-compat-api');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

async function proxyConsoleUi(request, env) {
  const incoming = new URL(request.url);
  const uiOrigin = normalizeUiOrigin(env.CONSOLE_UI_ORIGIN);
  assertDistinctUiOrigin(incoming.origin, uiOrigin);
  const target = new URL(`${incoming.pathname}${incoming.search}`, `${uiOrigin}/`);
  const upstream = await fetch(upstreamRequest(request, target, incoming, uiOrigin, 'console-compat-ui'));
  if (upstream.status === 101) return upstream;

  const headers = new Headers(upstream.headers);
  const location = rewriteUiLocation(headers.get('location'), incoming.origin, uiOrigin);
  if (location) headers.set('location', location);
  headers.set('cache-control', 'no-store');
  headers.set('x-relead-edge', 'relead-app-console-compat-ui');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

export function canonicalTarget(value) {
  const incoming = value instanceof URL ? new URL(value) : new URL(String(value));
  if (incoming.pathname === '/') return new URL('/console/', incoming.origin);
  if (isLocalProductConsoleRoute(incoming.pathname)) return localCanonicalTarget(incoming);
  if (isConsoleUiPath(incoming.pathname)) return localCanonicalTarget(incoming);
  return null;
}

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);

    try {
      if (url.pathname === '/healthz') {
        return withSecurity(Response.json({
          status: 'ok',
          edge: 'relead-app-user-console',
          canonical_console: CANONICAL_CONSOLE_ORIGIN,
          northbound_contract: '/v2 + /mcp',
        }));
      }

      if (url.pathname === '/') return redirect(new URL('/console/', url), 302);

      if (url.pathname === '/console/relnet/assets/ui.css') {
        return withSecurity(new Response(RELNET_CSS, {
          status: 200,
          headers: {
            'content-type': 'text/css; charset=utf-8',
            'x-relead-surface': 'relnet-next-console',
          },
        }));
      }

      if (['GET', 'HEAD'].includes(request.method) && isLocalProductConsoleRoute(url.pathname)) {
        return withSecurity(new Response(renderRelnetConsole(url.pathname), {
          status: 200,
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'x-relead-surface': 'relnet-next-console',
          },
        }));
      }

      // Compatibility-only paths. The canonical user API and MCP are handled by middleware
      // and proxy to Control Edge Northbound through RELNET_NORTHBOUND_ORIGIN.
      if (isBackendProxyPath(url.pathname, request.method)) return proxyBackend(request, env);

      if (['GET', 'HEAD'].includes(request.method) && isConsoleUiPath(url.pathname)) {
        return proxyConsoleUi(request, env);
      }

      // Builder/admin is intentionally not a Console surface.
      if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
        return withSecurity(Response.json({ detail: 'Not found' }, { status: 404 }));
      }

      return withSecurity(Response.json({
        detail: 'Not found',
        canonical_console: CANONICAL_CONSOLE_ORIGIN,
      }, { status: 404 }));
    } catch (error) {
      console.error('relead user console error', error);
      return withSecurity(Response.json({
        detail: 'Console unavailable',
        canonical_console: CANONICAL_CONSOLE_ORIGIN,
      }, { status: 502 }));
    }
  },
};
