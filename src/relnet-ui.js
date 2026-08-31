export const RELNET_NEXT_ROUTES = Object.freeze([
  '/console',
  '/console/network',
  '/console/nodes',
  '/console/access',
  '/console/billing',
]);

export const LOCAL_PRODUCT_ROUTES = RELNET_NEXT_ROUTES;
export const UI_STATES = Object.freeze(['loading','empty','offline','partial','degraded','blocked','error','retry','permission-denied','unsupported']);

const NAV = [
  ['Resumen','/console'],
  ['Mi red','/console/network'],
  ['Mis nodos','/console/nodes'],
  ['Acceso','/console/access'],
  ['Billing','/console/billing'],
];

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

export function isRelnetNextRoute(path) {
  const clean = path.replace(/\/$/, '') || '/';
  return RELNET_NEXT_ROUTES.includes(clean);
}
export function isLocalProductConsoleRoute(path) { return isRelnetNextRoute(path); }

function routeKey(pathname) {
  const clean = pathname.replace(/\/$/, '') || '/console';
  if (clean === '/console/network') return 'network';
  if (clean === '/console/nodes') return 'nodes';
  if (clean === '/console/access') return 'access';
  if (clean === '/console/billing') return 'billing';
  return 'overview';
}
function titleFor(key) { return ({overview:'Resumen',network:'Mi red',nodes:'Mis nodos',access:'Acceso',billing:'Billing'})[key] || 'RelNets'; }

function overview() {
  return `<section class="grid overview-grid">
    <article class="card span8"><span class="kicker">RelNets</span><h2>Tu red privada</h2><p>Estado, identidad, dispositivos y automatizaciones de tu RelNet en una sola experiencia.</p><div id="primary-data" class="data-panel" data-endpoint="/v2/me"></div></article>
    <article class="card span4"><span class="kicker">Conectividad</span><h2>Estado protegido</h2><p>RelNets valida identidad, permisos y políticas antes de ejecutar acciones sensibles.</p><div class="status-line"><i></i><span id="northbound-status">Comprobando…</span></div></article>
    <article class="card span6"><h3>Mi red</h3><div id="network-summary" class="data-panel compact" data-endpoint="/v2/network"></div><a class="button secondary" href="/dashboard/network">Abrir red</a></article>
    <article class="card span6"><h3>Mis nodos</h3><div id="nodes-summary" class="data-panel compact" data-endpoint="/v2/nodes"></div><a class="button secondary" href="/dashboard/nodes">Abrir nodos</a></article>
  </section>`;
}
function network() {
  return `<section class="grid"><article class="card span12"><span class="kicker">Network</span><h2>Mi red</h2><p>Topología, estado y accesos de tu Space, presentados sin exponer infraestructura interna.</p><div id="primary-data" class="data-panel" data-endpoint="/v2/network"></div></article></section>`;
}
function nodes() {
  return `<section class="grid"><article class="card span12"><span class="kicker">Nodes</span><h2>Mis nodos</h2><p>Dispositivos autorizados dentro de tu RelNet. El enrolamiento requiere identidad, scope y entitlement válidos.</p><div id="primary-data" class="data-panel" data-endpoint="/v2/nodes"></div></article></section>`;
}
function access() {
  return `<section class="grid"><article class="card span7"><span class="kicker">Access</span><h2>Acceso autorizado</h2><p>Las sesiones requieren scope, ownership, entitlement y policy efectivos. MCP requiere Bearer explícito.</p><div id="primary-data" class="data-panel" data-endpoint="/v2/me"></div></article><article class="card span5"><h3>Seguridad</h3><ul class="clean-list"><li>La consola no almacena contraseñas de nodos.</li><li>Las acciones sensibles requieren reautenticación cuando corresponde.</li><li>Los permisos se resuelven server-side y no desde el navegador.</li></ul></article></section>`;
}
function billing() {
  return `<section class="grid billing-grid">
    <article class="card span12"><span class="kicker">Billing</span><h2>Plan, créditos y beneficios</h2><p>El estado comercial y los permisos efectivos se resuelven server-side. Una redirección de Checkout nunca concede capacidades por sí sola.</p><div id="billing-notice" class="state" hidden></div><div id="primary-data" class="data-panel" data-endpoint="/v2/billing/me"></div></article>
    <article class="card span6 plan-card"><span class="plan-label">PRO</span><h3>RelNets Pro</h3><p><strong>$199 MXN/mes</strong> · $1,990 MXN/año</p><ul class="clean-list"><li>1,200 créditos de IA al mes</li><li>Automatización avanzada</li><li>Agent RelNets vía MCP / API</li><li>Sin anuncios</li></ul><div class="action-row"><button class="button" type="button" data-checkout-plan="pro" data-checkout-interval="month">Pro · $199 MXN/mes</button><button class="button secondary" type="button" data-checkout-plan="pro" data-checkout-interval="year">Pro · $1,990 MXN/año</button></div></article>
    <article class="card span6 plan-card"><span class="plan-label">TEAM</span><h3>RelNets Team</h3><p><strong>$499 MXN/mes</strong> · $4,990 MXN/año</p><ul class="clean-list"><li>5,000 créditos de IA compartidos al mes</li><li>Hasta 5 usuarios</li><li>Administración compartida</li><li>Sin anuncios</li></ul><div class="action-row"><button class="button" type="button" data-checkout-plan="team" data-checkout-interval="month">Team · $499 MXN/mes</button><button class="button secondary" type="button" data-checkout-plan="team" data-checkout-interval="year">Team · $4,990 MXN/año</button></div></article>
    <article class="card span12 ai-credit-card"><span class="kicker">Créditos de IA</span><h3>Compra más cuando los necesites</h3><p>Los créditos incluidos se renuevan con tu plan. Los paquetes comprados se agregan a tu saldo adicional.</p><div id="ai-credit-balance" class="data-panel compact" data-endpoint="/v2/billing/credits"></div><div class="credit-packages"><button class="button secondary" data-credit-package="ai500" type="button">500 · $49 MXN</button><button class="button secondary" data-credit-package="ai2000" type="button">2,000 · $149 MXN</button><button class="button secondary" data-credit-package="ai10000" type="button">10,000 · $499 MXN</button></div></article>
    <article class="card span7"><h3>Administrar suscripción</h3><p>Actualiza método de pago, consulta facturas o administra tu suscripción desde Customer Portal.</p><button class="button secondary" type="button" id="billing-portal">Abrir Customer Portal</button></article>
    <article class="card span5 sponsored-card" data-free-sponsored hidden><span class="sponsor-label">Patrocinado</span><h3>Espacio para partners</h3><p>Los usuarios Free pueden ver contenido patrocinado. Pro, Team y Enterprise son siempre sin anuncios.</p></article>
  </section>`;
}
function bodyFor(key) { return key === 'network' ? network() : key === 'nodes' ? nodes() : key === 'access' ? access() : key === 'billing' ? billing() : overview(); }

function clientScript() {
  return `<script>
  (() => {
    const safe = (v) => String(v == null ? '—' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
    const render = (value) => {
      if (Array.isArray(value)) return value.length ? '<ul class="data-list">'+value.slice(0,12).map(v=>'<li>'+render(v)+'</li>').join('')+'</ul>' : '<p class="muted">Sin elementos.</p>';
      if (value && typeof value === 'object') return '<dl class="kv">'+Object.entries(value).slice(0,18).map(([k,v])=>'<div><dt>'+safe(k)+'</dt><dd>'+((v&&typeof v==='object')?render(v):safe(v))+'</dd></div>').join('')+'</dl>';
      return '<span>'+safe(value)+'</span>';
    };
    async function load(el) {
      const endpoint = el.dataset.endpoint === '/v2/billing/me' ? '/v2/billing' : el.dataset.endpoint;
      el.innerHTML='<div class="state" data-ui-state="loading">Cargando…</div>';
      try {
        const response=await fetch(endpoint,{headers:{accept:'application/json'},credentials:'same-origin'});
        if(response.status===401||response.status===403){el.innerHTML='<div class="state denied" data-ui-state="permission-denied">No autorizado para esta vista.</div>';return null;}
        if(response.status===503||response.status===502){el.innerHTML='<div class="state blocked" data-ui-state="blocked">Servicio temporalmente no disponible.</div>';return null;}
        if(!response.ok){el.innerHTML='<div class="state error" data-ui-state="error">No fue posible obtener esta información.</div>';return null;}
        const data=await response.json(); el.innerHTML=render(data); return data;
      }catch(_){el.innerHTML='<div class="state offline" data-ui-state="offline">Sin conexión al servicio.</div>';return null;}
    }
    function notice(text,kind='loading'){const el=document.getElementById('billing-notice');if(!el)return;el.hidden=false;el.dataset.uiState=kind;el.textContent=text;}
    async function post(path,body){const r=await fetch(path,{method:'POST',headers:{accept:'application/json','content-type':'application/json'},credentials:'same-origin',body:JSON.stringify(body||{})});if(r.status===401||r.status===403)throw new Error('unauthorized');if(!r.ok)throw new Error('unavailable');const data=await r.json();if(!data||typeof data.url!=='string')throw new Error('unavailable');window.location.assign(data.url);}
    document.querySelectorAll('[data-checkout-plan]').forEach(button=>button.addEventListener('click',async()=>{button.disabled=true;notice('Preparando Checkout seguro…');try{await post('/v2/billing/checkout',{plan_slug:button.dataset.checkoutPlan,billing_interval:button.dataset.checkoutInterval});}catch(_){button.disabled=false;notice('Checkout no disponible en este momento.','error');}}));
    document.querySelectorAll('[data-credit-package]').forEach(button=>button.addEventListener('click',async()=>{button.disabled=true;notice('Preparando compra de créditos…');try{await post('/v2/billing/credits/checkout',{package_slug:button.dataset.creditPackage});}catch(_){button.disabled=false;notice('Compra de créditos no disponible en este momento.','error');}}));
    const portal=document.getElementById('billing-portal');if(portal)portal.addEventListener('click',async()=>{portal.disabled=true;notice('Abriendo Customer Portal…');try{await post('/v2/billing/portal',{});}catch(_){portal.disabled=false;notice('Customer Portal no disponible en este momento.','error');}});
    const params=new URLSearchParams(window.location.search);if(params.get('billing')==='success')notice('Checkout completado. Verificando la suscripción confirmada por webhook…','loading');if(params.get('billing')==='cancel')notice('Checkout cancelado. No se realizó ningún cambio de acceso.','empty');
    const nodes=[...document.querySelectorAll('[data-endpoint]')];Promise.all(nodes.map(load)).then(results=>{const status=document.getElementById('northbound-status');if(status)status.textContent=results.some(Boolean)?'Conectado':'Pendiente';const billingNode=nodes.find(n=>n.dataset.endpoint==='/v2/billing/me');const billingData=billingNode?results[nodes.indexOf(billingNode)]:null;const plan=String(billingData?.plan_slug||billingData?.plan||'free').toLowerCase();const paid=['pro','team','enterprise'].includes(plan)&&!['canceled','inactive','past_due'].includes(String(billingData?.status||'').toLowerCase());document.querySelectorAll('[data-free-sponsored]').forEach(el=>{el.hidden=paid;});});
  })();
  </script>`;
}

export function renderRelnetConsole(pathname) {
  const clean=pathname.replace(/\/$/,'')||'/console'; const key=routeKey(clean); const title=titleFor(key);
  const nav=NAV.map(([label,href])=>`<a href="${href.replace('/console','/dashboard')||'/dashboard'}"${routeKey(href)===key?' aria-current="page"':''}>${esc(label)}</a>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)} · RelNets</title><link rel="stylesheet" href="/console/relnet/assets/ui.css"></head><body><a class="skip" href="#main-content">Saltar al contenido</a><div class="app"><aside class="sidebar"><a class="brand" href="/dashboard" aria-label="RelNets"><img src="https://relnets.com/relnet-brand-transparent.png" alt="RelNets"><span>Console</span></a><nav class="nav" aria-label="Navegación de RelNets">${nav}</nav><div class="sidebar-foot"><small>USER CONSOLE</small><strong>Tenant scoped</strong><small>Identidad · API · MCP</small></div></aside><div class="workspace"><header class="topbar"><div><span class="breadcrumb">console.relnets.com</span><strong>${esc(title)}</strong></div><div class="topmeta"><span class="badge">RelNets</span><a href="https://auth.relnets.com/access">Cuenta</a></div></header><main id="main-content" class="content"><div class="hero"><div><span class="eyebrow">Authenticated user console</span><h1>${esc(title)}</h1><p>Una sola superficie para tu identidad, tu red, tus dispositivos, automatización, IA y suscripción.</p></div></div>${bodyFor(key)}</main><footer class="footer">RelNets · Network · Relay · Automate</footer></div></div>${clientScript()}</body></html>`;
}
