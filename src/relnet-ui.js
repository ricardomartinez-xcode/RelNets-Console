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
  ['Resumen', '/console'],
  ['Mi red', '/console/network'],
  ['Mis nodos', '/console/nodes'],
  ['Acceso', '/console/access'],
  ['Billing', '/console/billing'],
];

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

export function isRelnetNextRoute(path) {
  const clean = path.replace(/\/$/, '') || '/';
  return RELNET_NEXT_ROUTES.includes(clean);
}

export function isLocalProductConsoleRoute(path) {
  return isRelnetNextRoute(path);
}

function routeKey(pathname) {
  const clean = pathname.replace(/\/$/, '') || '/console';
  if (clean === '/console/network') return 'network';
  if (clean === '/console/nodes') return 'nodes';
  if (clean === '/console/access') return 'access';
  if (clean === '/console/billing') return 'billing';
  return 'overview';
}

function titleFor(key) {
  return ({overview:'Resumen',network:'Mi red',nodes:'Mis nodos',access:'Acceso',billing:'Billing'})[key] || 'RelNet';
}

function endpointFor(key) {
  if (key === 'network') return '/v2/network';
  if (key === 'nodes') return '/v2/nodes';
  if (key === 'billing') return '/v2/billing/me';
  return '/v2/me';
}

function bodyFor(key) {
  if (key === 'overview') return `
    <section class="grid overview-grid">
      <article class="card span8"><span class="kicker">RelNet</span><h2>Tu red privada</h2><p>Estado, identidad y operaciones de tu Space se obtienen desde el mismo control-plane Northbound que usa MCP.</p><div id="primary-data" class="data-panel" data-endpoint="/v2/me"></div></article>
      <article class="card span4"><span class="kicker">Control plane</span><h2>Northbound</h2><p>La Console no elige controllers ni expone infraestructura global. Las decisiones de placement, policy y dispatch ocurren server-side.</p><div class="status-line"><i></i><span id="northbound-status">Comprobando…</span></div></article>
      <article class="card span6"><h3>Mi red</h3><div id="network-summary" class="data-panel compact" data-endpoint="/v2/network"></div><a class="button secondary" href="/dashboard/network">Abrir red</a></article>
      <article class="card span6"><h3>Mis nodos</h3><div id="nodes-summary" class="data-panel compact" data-endpoint="/v2/nodes"></div><a class="button secondary" href="/dashboard/nodes">Abrir nodos</a></article>
    </section>`;
  if (key === 'network') return `<section class="grid"><article class="card span12"><span class="kicker">Network</span><h2>Mi red</h2><p>Topología y estado observados únicamente dentro de tu Space.</p><div id="primary-data" class="data-panel" data-endpoint="/v2/network"></div></article></section>`;
  if (key === 'nodes') return `<section class="grid"><article class="card span12"><span class="kicker">Nodes</span><h2>Mis nodos</h2><p>Inventario de nodos autorizado para tu red. Enrollment y mutaciones se habilitan sólo cuando Northbound confirma scope y entitlement.</p><div id="primary-data" class="data-panel" data-endpoint="/v2/nodes"></div></article></section>`;
  if (key === 'access') return `<section class="grid"><article class="card span7"><span class="kicker">Access</span><h2>Acceso autorizado</h2><p>SSH y otras sesiones se solicitan a través de Northbound y requieren scope, ownership, entitlement y policy efectivos.</p><div id="primary-data" class="data-panel" data-endpoint="/v2/me"></div></article><article class="card span5"><h3>Seguridad</h3><ul class="clean-list"><li>La Console no almacena contraseñas de nodos.</li><li>MCP requiere Bearer explícito.</li><li>Los dispatch tickets son internos al control-plane.</li><li><code>platform:*</code> pertenece sólo a Builder.</li></ul></article></section>`;
  return `<section class="grid"><article class="card span12"><span class="kicker">Billing</span><h2>Plan y entitlements</h2><p>El plan comercial y los permisos efectivos se resuelven server-side; la UI nunca concede capacidades.</p><div id="primary-data" class="data-panel" data-endpoint="/v2/billing/me"></div></article></section>`;
}

function clientScript() {
  return `<script>
  (() => {
    const safe = (v) => String(v == null ? '—' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
    const render = (value) => {
      if (Array.isArray(value)) return value.length ? '<ul class="data-list">' + value.slice(0,12).map(v => '<li>' + render(v) + '</li>').join('') + '</ul>' : '<p class="muted">Sin elementos.</p>';
      if (value && typeof value === 'object') return '<dl class="kv">' + Object.entries(value).slice(0,18).map(([k,v]) => '<div><dt>'+safe(k)+'</dt><dd>'+((v && typeof v === 'object') ? render(v) : safe(v))+'</dd></div>').join('') + '</dl>';
      return '<span>'+safe(value)+'</span>';
    };
    async function load(el) {
      const endpoint = el.dataset.endpoint;
      el.innerHTML = '<div class="state" data-ui-state="loading">Cargando…</div>';
      try {
        const response = await fetch(endpoint, {headers:{accept:'application/json'}, credentials:'same-origin'});
        if (response.status === 401 || response.status === 403) { el.innerHTML = '<div class="state denied" data-ui-state="permission-denied">No autorizado para esta vista.</div>'; return false; }
        if (response.status === 503 || response.status === 502) { el.innerHTML = '<div class="state blocked" data-ui-state="blocked">Control Edge Northbound pendiente o no disponible.</div>'; return false; }
        if (!response.ok) { el.innerHTML = '<div class="state error" data-ui-state="error">No fue posible obtener esta información.</div>'; return false; }
        const data = await response.json();
        el.innerHTML = render(data);
        return true;
      } catch (_) {
        el.innerHTML = '<div class="state offline" data-ui-state="offline">Sin conexión al control-plane.</div>';
        return false;
      }
    }
    Promise.all([...document.querySelectorAll('[data-endpoint]')].map(load)).then(results => {
      const status = document.getElementById('northbound-status');
      if (status) status.textContent = results.some(Boolean) ? 'Conectado' : 'Pendiente';
    });
  })();
  </script>`;
}

export function renderRelnetConsole(pathname) {
  const clean = pathname.replace(/\/$/, '') || '/console';
  const key = routeKey(clean);
  const title = titleFor(key);
  const nav = NAV.map(([label, href]) => `<a href="${href.replace('/console','/dashboard') || '/dashboard'}"${routeKey(href) === key ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)} · RelNet</title><link rel="stylesheet" href="/console/relnet/assets/ui.css"></head><body><a class="skip" href="#main-content">Saltar al contenido</a><div class="app"><aside class="sidebar"><a class="brand" href="/dashboard" aria-label="RelNet"><img src="https://relead.com.mx/relnet-brand-transparent.png" alt="RelNet"><span>Console</span></a><nav class="nav" aria-label="Navegación de RelNet">${nav}</nav><div class="sidebar-foot"><small>USER CONTROL PLANE</small><strong>Tenant scoped</strong><small>API + MCP → Northbound</small></div></aside><div class="workspace"><header class="topbar"><div><span class="breadcrumb">console.relead.com.mx</span><strong>${esc(title)}</strong></div><div class="topmeta"><span class="badge">RelNet</span><a href="https://auth.relead.com.mx/access">Cuenta</a></div></header><main id="main-content" class="content"><div class="hero"><div><span class="eyebrow">Authenticated user console</span><h1>${esc(title)}</h1><p>Una sola superficie para tu identidad, tu red y tus nodos. La autoridad vive en Auth + Northbound, no en el navegador.</p></div></div>${bodyFor(key)}</main><footer class="footer">ReLead · RelNet Console · user-plane</footer></div></div>${clientScript()}</body></html>`;
}
