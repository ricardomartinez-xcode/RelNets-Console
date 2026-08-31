import originalMiddleware from './middleware-impl.js';
export * from './middleware-impl.js';

export const config = { runtime: 'nodejs' };

function isIdentityPath(pathname) {
  return pathname === '/login'
    || pathname === '/signup'
    || pathname === '/logout'
    || pathname.startsWith('/oauth/')
    || pathname.startsWith('/.well-known/');
}

function sanitizeProxyResponse(request, response) {
  const pathname = new URL(request.url).pathname;
  if (!isIdentityPath(pathname)) return response;

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('transfer-encoding');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default async function middleware(request) {
  const response = await originalMiddleware(request);
  return sanitizeProxyResponse(request, response);
}
