import{canonicalConsoleUrl,isLegacyProxyPath,isPanelPath,normalizeOrigin}from'./policy.js';

const SECURITY_HEADERS={
  'cache-control':'no-store',
  'referrer-policy':'no-referrer',
  'x-content-type-options':'nosniff',
  'x-frame-options':'DENY'
};

function withSecurity(response){
  const next=new Response(response.body,response);
  for(const [key,value] of Object.entries(SECURITY_HEADERS)) next.headers.set(key,value);
  return next;
}

function redirect(target,status=308){
  return withSecurity(new Response(null,{status,headers:{location:target.toString()}}));
}

function rewriteBackendLocation(location,backendOrigin){
  if(!location) return null;
  let resolved;
  try{resolved=new URL(location,`${backendOrigin}/`);}catch{return location;}
  if(resolved.origin!==backendOrigin) return location;
  if(!isPanelPath(resolved.pathname)) return location;
  return canonicalConsoleUrl(resolved).toString();
}

async function proxyLegacy(request,env){
  const incoming=new URL(request.url);
  const backendOrigin=normalizeOrigin(env.BACKEND_ORIGIN);
  let backendPath=incoming.pathname;
  if(backendPath==='/console/auth') backendPath='/console/login';
  if(backendPath==='/admin/auth') backendPath='/admin/login';
  const target=new URL(`${backendPath}${incoming.search}`,`${backendOrigin}/`);
  const headers=new Headers(request.headers);
  headers.set('x-forwarded-host',incoming.host);
  headers.set('x-forwarded-proto','https');
  headers.set('x-relead-edge-surface',incoming.pathname.startsWith('/console')?'console':'admin');
  if(headers.has('origin')) headers.set('origin',backendOrigin);
  if(headers.has('referer')) headers.set('referer',`${backendOrigin}${backendPath}`);
  headers.delete('host');

  const upstream=await fetch(new Request(target,{
    method:request.method,
    headers,
    body:['GET','HEAD'].includes(request.method)?undefined:request.body,
    redirect:'manual'
  }));
  if(upstream.status===101) return upstream;

  const responseHeaders=new Headers(upstream.headers);
  const location=rewriteBackendLocation(responseHeaders.get('location'),backendOrigin);
  if(location) responseHeaders.set('location',location);
  responseHeaders.set('cache-control','no-store');
  responseHeaders.set('x-relead-edge','relead-app-v90-legacy');
  responseHeaders.set('x-content-type-options','nosniff');
  return new Response(upstream.body,{status:upstream.status,statusText:upstream.statusText,headers:responseHeaders});
}

export default{
  async fetch(request,env){
    const url=new URL(request.url);

    if(url.pathname==='/healthz'){
      return withSecurity(Response.json({status:'ok',edge:'relead-app-v90-legacy',canonical_console:'https://console.relead.com.mx'}));
    }

    if(url.pathname==='/') return redirect(canonicalConsoleUrl(url));

    // Keep only API and non-GET auth compatibility during migration.
    if(isLegacyProxyPath(url.pathname,request.method)) return proxyLegacy(request,env);

    // ReLead-App no longer serves a graphical surface.
    if(isPanelPath(url.pathname)&&['GET','HEAD'].includes(request.method)){
      return redirect(canonicalConsoleUrl(url));
    }

    return withSecurity(Response.json({detail:'Not found',canonical_console:'https://console.relead.com.mx'},{status:404}));
  }
};
