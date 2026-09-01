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

function cleanHeaders(response) {
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('transfer-encoding');
  return headers;
}

export function sanitizeLegacyConsoleHtml(html) {
  return String(html).replace(
    '<a href="https://auth.relnets.com/access">Cuenta</a>',
    '<a href="/dashboard/access">Cuenta</a>',
  );
}

async function sanitizeProxyResponse(request, response) {
  const pathname = new URL(request.url).pathname;
  if (isIdentityPath(pathname)) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: cleanHeaders(response),
    });
  }

  const contentType = response.headers.get('content-type') || '';
  if ((pathname === '/dashboard' || pathname.startsWith('/dashboard/'))
      && contentType.includes('text/html')) {
    const html = await response.text();
    return new Response(sanitizeLegacyConsoleHtml(html), {
      status: response.status,
      statusText: response.statusText,
      headers: cleanHeaders(response),
    });
  }

  return response;
}

export default async function middleware(request) {
  const response = await originalMiddleware(request);
  return sanitizeProxyResponse(request, response);
}
