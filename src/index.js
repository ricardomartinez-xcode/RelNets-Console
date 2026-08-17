const PUBLIC_SITE = 'https://relead.com.mx';
const CANONICAL_CONSOLE = 'https://console.relead.com.mx';

function canonicalTarget(url) {
  if (url.pathname === '/') return new URL(PUBLIC_SITE);
  if (url.pathname === '/console' || url.pathname.startsWith('/console/')) {
    const target = new URL(url.pathname + url.search, CANONICAL_CONSOLE);
    target.hash = url.hash;
    return target;
  }
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
    const target = new URL(url.pathname + url.search, CANONICAL_CONSOLE);
    target.hash = url.hash;
    return target;
  }
  if (url.pathname === '/login') {
    return new URL('/console/login' + url.search, CANONICAL_CONSOLE);
  }
  return null;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/healthz') {
      return Response.json(
        {
          status: 'ok',
          edge: 'relead-app-v90-canonical-redirect',
          canonical_console: CANONICAL_CONSOLE,
        },
        { headers: { 'cache-control': 'no-store' } },
      );
    }

    const target = canonicalTarget(url);
    if (target) {
      return Response.redirect(target.toString(), 308);
    }

    return Response.json(
      {
        detail: 'Not found',
        canonical_console: CANONICAL_CONSOLE,
      },
      {
        status: 404,
        headers: {
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
        },
      },
    );
  },
};

export { canonicalTarget };
