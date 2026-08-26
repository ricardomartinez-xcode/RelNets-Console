export const CANONICAL_CONSOLE_ORIGIN = 'https://console.relead.com.mx';
export const DEFAULT_CONSOLE_UI_ORIGIN = 'https://admin.relead.com.mx';

// Transitional compatibility only. Canonical /v2 and /mcp never use this list.
const BACKEND_PREFIXES = ['/console/api/','/api/v1/','/relnet/v1/','/install/','/ws/'];
const AUTH_MUTATION_PATHS = new Set(['/console/login','/console/auth']);
const LOCAL_USER_ROUTES = new Set(['/console','/console/network','/console/nodes','/console/access','/console/billing']);

export function isPanelPath(path) {
  return path === '/console' || path.startsWith('/console/');
}

export function isBackendProxyPath(path, method = 'GET') {
  if (BACKEND_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
  return AUTH_MUTATION_PATHS.has(path) && !['GET','HEAD'].includes(String(method).toUpperCase());
}

export const isLegacyProxyPath = isBackendProxyPath;

export function isConsoleUiPath(path) {
  const clean = path.replace(/\/$/, '') || '/console';
  if (LOCAL_USER_ROUTES.has(clean)) return false;
  if (path === '/register' || path.startsWith('/register/')) return true;
  if (path === '/security/otp' || path.startsWith('/security/otp/')) return true;
  return false;
}

export function canonicalConsoleUrl(value, origin = CANONICAL_CONSOLE_ORIGIN) {
  const source = value instanceof URL ? new URL(value) : new URL(String(value), CANONICAL_CONSOLE_ORIGIN);
  const target = new URL('/console/', origin);
  if (source.pathname.startsWith('/console/')) target.pathname = source.pathname;
  else if (source.pathname === '/console') target.pathname = '/console/';
  for (const [key, val] of source.searchParams) target.searchParams.append(key, val);
  return target;
}

export function localCanonicalTarget(value) {
  const source = value instanceof URL ? new URL(value) : new URL(String(value), CANONICAL_CONSOLE_ORIGIN);
  return canonicalConsoleUrl(source, source.origin);
}

export function normalizeOrigin(value) {
  const url = new URL(value || 'https://api.relead.com.mx');
  if (url.protocol !== 'https:') throw new Error('BACKEND_ORIGIN must use HTTPS');
  url.pathname = '/'; url.search = ''; url.hash = '';
  return url.toString().replace(/\/$/, '');
}

export function normalizeUiOrigin(value) {
  const url = new URL(value || DEFAULT_CONSOLE_UI_ORIGIN);
  if (url.protocol !== 'https:') throw new Error('CONSOLE_UI_ORIGIN must use HTTPS');
  url.pathname = '/'; url.search = ''; url.hash = '';
  return url.toString().replace(/\/$/, '');
}

export function assertDistinctUiOrigin(incomingOrigin, uiOrigin) {
  if (new URL(incomingOrigin).origin === new URL(uiOrigin).origin) {
    throw new Error('Console UI upstream cannot equal the incoming console origin.');
  }
}

export function rewriteUiLocation(location, incomingOrigin, uiOrigin) {
  if (!location) return null;
  let resolved;
  try {
    resolved = new URL(location, `${uiOrigin}/`);
  } catch {
    return location;
  }
  if (resolved.origin !== new URL(uiOrigin).origin) return location;
  return new URL(`${resolved.pathname}${resolved.search}${resolved.hash}`, incomingOrigin).toString();
}

export function shouldInjectHtml(){return false;}
export function isThemeableStylesheet(){return false;}
export function injectTheme(html){return html;}
