import originalMiddleware, { safeReturnTo } from './middleware-impl.js';
export * from './middleware-impl.js';

export const config = { runtime: 'nodejs' };

const ACCESS_COOKIE = '__Host-relead_console_at';
const LEGACY_ACCOUNT_URL = 'https://auth.relnets.com/access';
const LOCAL_ACCOUNT_URL = '/dashboard/access';

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
  let response = await originalMiddleware(request);
  response = guardAuthLoop(request, response);
  response = await rewriteLegacyAccountLink(response);
  return sanitizeProxyResponse(request, response);
}
