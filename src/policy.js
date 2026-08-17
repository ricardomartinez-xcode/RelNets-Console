export const CANONICAL_CONSOLE_ORIGIN='https://console.relead.com.mx';
export const PANEL_PREFIXES=['/admin','/console'];
export const LEGACY_API_PREFIXES=['/admin/api/','/console/api/'];

export function isPanelPath(path){
  return PANEL_PREFIXES.some(prefix=>path===prefix||path.startsWith(`${prefix}/`));
}

export function isLegacyProxyPath(path,method='GET'){
  if(LEGACY_API_PREFIXES.some(prefix=>path.startsWith(prefix))) return true;
  const authPath=['/admin/login','/console/login','/admin/auth','/console/auth'].includes(path);
  return authPath&&!['GET','HEAD'].includes(String(method).toUpperCase());
}

export function canonicalConsoleUrl(value){
  const source=value instanceof URL?new URL(value):new URL(String(value),'https://app.relead.com.mx');
  const target=new URL('/console/',CANONICAL_CONSOLE_ORIGIN);

  if(source.pathname.startsWith('/console/')) target.pathname=source.pathname;
  else if(source.pathname==='/console') target.pathname='/console/';
  else if(source.pathname.startsWith('/admin/static/')) target.pathname=source.pathname.replace('/admin/static/','/console/static/');
  else if(source.pathname==='/admin/manifest.webmanifest') target.pathname='/console/manifest.webmanifest';
  else if(source.pathname==='/admin/sw.js') target.pathname='/console/sw.js';
  else if(source.pathname==='/admin/login'||source.pathname==='/admin/auth') target.pathname='/console/login';

  for(const [key,val] of source.searchParams) target.searchParams.append(key,val);
  if(source.pathname==='/admin'||source.pathname==='/admin/'||(source.pathname.startsWith('/admin/')&&!source.pathname.startsWith('/admin/static/'))) target.searchParams.set('area','admin');
  return target;
}

export function normalizeOrigin(value){
  const url=new URL(value||'https://api.relead.com.mx');
  if(url.protocol!=='https:') throw new Error('BACKEND_ORIGIN must use HTTPS');
  url.pathname='/';url.search='';url.hash='';
  return url.toString().replace(/\/$/,'');
}

export function shouldInjectHtml(){return false;}
export function isThemeableStylesheet(){return false;}
export function injectTheme(html){return html;}
