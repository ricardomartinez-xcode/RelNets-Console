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

function bodyFor(key) {
  if (key === 'overview') return `
    <section class="grid overview-grid">
      <article class="card span8"><span class="kicker">RelNet</span><h2>Tu red privada</h2><p>Estado, identidad y operaciones de tu Space se obtienen desde el mismo control-plane Northbound que usa MCP.</p><div id="primary-data" class="data-panel" data-endpoint="/v2/me"></div></article>
      <article class="card span4"><span class="kicker">Control plane</span><h2>Northbound</h2><p>La Console no elige controllers ni expone global infrastructure. Las decisiones de placement, policy y dispatch ocurren server-side.</p><div class="status-line"><i></i><span id="northbound-status">Comprobando…</span></div></article>
      <article class="card span6"><h3>Mi red</h3><div id="network-summary" class="data-panel compact" data-endpoint="/v2/network"></div><a class="button secondary" href="/dashboard/network">Abrir red</a></article>
      <article class="card span6"><h3>Mis nodos</h3><div id="nodes-summary" class="data-panel compact" data-endpoint="/v2/nodes"></div><a class="button secondary" href="/dashboard/nodes">Abrir nodos</a></article>
    </section>`;
  if (key === 'network') return `<section class="grid"><article class="card span12"><span class="kicker">Network</span><h2>Mi red</h2><p>Topología y estado observados únicamente dentro de tu Space.</p><div id="primary-data" class="data-panel" data-endpoint="/v2/network"></div></article></section>`;
  if (key === 'nodes') return `<section class="grid"><article class="card span12"><span class="kicker">Nodes</span><h2>Mis nodos</h2><p>Inventario de nodos autorizados para tu red. Enrollment y mutaciones se habilitan sólo cuando Northbound confirma scope y entitlement.</p><div id="primary-data" class="data-panel" data-endpoint="/v2/nodes"></div></article></section>`;
  if (key === 'access') return `<section class="grid"><article class="card span7"><span class="kicker">Access</span><h2>Acceso autorizado</h2><p>SSH y otras sesiones se solicitan a través de Northbound y requieren scope, ownership, entitlement y policy efectivos.</p><div id="primary-data" class="data-panel" data-endpoint="/v2/me"></div></article><article class="card span5"><h3>Seguridad</h3><ul class="clean-list"><li>La Console no almacena contraseñas de nodos.</li><li>MCP requiere Bearer explícito.</li><li>Los dispatch tickets son internos al control-plane.</li><li><code>platform:*</code> pertenece sólo a Builder.</li></ul></article></section>`;

  return `<section class="grid">
    <article class="card span12">
      <span class="kicker">Billing</span><h2>Plan y entitlements</h2>
      <p>El estado comercial y los permisos efectivos se resuelven server-side. La UI nunca concede capacidades por una redirección de Checkout.</p>
      <div id="billing-notice" class="state" hidden></div>
      <div id="primary-data" class="data-panel" data-endpoint="/v2/billing/me"></div>
    </article>
    <article class="card span6">
      <h3>RelNet Pro</h3><p>Para uso individual y operación de tu red privada.</p>
      <div class="action-row">
        <button class="button" type="button" data-checkout-plan="pro" data-checkout-interval="month">Pro · $149 MXN/mes</button>
        <button class="button secondary" type="button" data-checkout-plan="pro" data-checkout-interval="year">Pro · $1,490 MXN/año</button>
      </div>
    </article>
    <article class="card span6">
      <h3>RelNet Team</h3><p>Para equipos que operan el mismo Space y sus recursos.</p>
      <div class="action-row">
        <button class="button" type="button" data-checkout-plan="team" data-checkout-interval="month">Team · $399 MXN/mes</button>
        <button class="button secondary" type="button" data-checkout-plan="team" data-checkout-interval="year">Team · $3,990 MXN/año</button>
      </div>
    </article>
    <article class="card span12">
      <h3>Administrar suscripción</h3>
      <p>Actualiza método de pago, consulta facturas o programa cancelación desde Customer Portal.</p>
      <button class="button secondary" type="button" id="billing-portal">Abrir Customer Portal</button>
      <details class="billing-fallback"><summary>Fallback de pago</summary><p>Si Checkout desde la Console no está disponible, usa temporalmente un Payment Link.</p>
        <ul class="clean-list">
          <li><a href="https://buy.stripe.com/00w8wI0KS5YnbxwbPB3cc01" rel="noreferrer">Pro mensual</a></li>
          <li><a href="https://buy.stripe.com/5kQ3co9hogD1ats9Ht3cc02" rel="noreferrer">Pro anual</a></li>
          <li><a href="https://buy.stripe.com/14AdR279g86v4542f13cc03" rel="noreferrer">Team mensual</a></li>
          <li><a href="https://buy.stripe.com/5kQ4gsdxEfyX5985rd3cc04" rel="noreferrer">Team anual</a></li>
        </ul>
      </details>
    </article>
  </section>`;
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
      const endpoint = el.dataset.endpoint === '/v2/billing/me' ? '/v2/billing' : el.dataset.endpoint;
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

    function billingMessage(text, kind) {
      const el = document.getElementById('billing-notice');
      if (!el) return;
      el.hidden = false;
      el.dataset.uiState = kind || 'loading';
      el.textContent = text;
    }

    async function billingPost(path, body) {
      const response = await fetch(path, {
        method:'POST',
        headers:{accept:'application/json','content-type':'application/json'},
        credentials:'same-origin',
        body: JSON.stringify(body || {})
      });
      if (response.status === 401 || response.status === 403) throw new Error('unauthorized');
      if (!response.ok) throw new Error('billing_unavailable');
      const data = await response.json();
      if (!data || typeof data.url !== 'string') throw new Error('billing_unavailable');
      window.location.assign(data.url);
    }

    document.querySelectorAll('[data-checkout-plan]').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        billingMessage('Preparando Checkout seguro…', 'loading');
        try {
          await billingPost('/v2/billing/checkout', {
            plan_slug: button.dataset.checkoutPlan,
            billing_interval: button.dataset.checkoutInterval
          });
        } catch (_) {
          button.disabled = false;
          billingMessage('Checkout no disponible. El Payment Link queda sólo como fallback.', 'error');
        }
      });
    });

    const portal = document.getElementById('billing-portal');
    if (portal) portal.addEventListener('click', async () => {
      portal.disabled = true;
      billingMessage('Abriendo Customer Portal…', 'loading');
      try {
        await billingPost('/v2/billing/portal', {});
      } catch (_) {
        portal.disabled = false;
        billingMessage('Customer Portal todavía no está disponible para esta cuenta.', 'error');
      }
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') === 'success') billingMessage('Checkout completado. Verificando la suscripción confirmada por webhook…', 'loading');
    if (params.get('billing') === 'cancel') billingMessage('Checkout cancelado. No se realizó ningún cambio de acceso.', 'empty');

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
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)} · RelNet</title><link rel="stylesheet" href="/console/relnet/assets/ui.css"></head><body><a class="skip" href="#main-content">Saltar al contenido</a><div class="app"><aside class="sidebar"><a class="brand" href="/dashboard" aria-label="RelNet"><img src="https://relead.com.mx/relnet-brand-transparent.png" alt="RelNet"><span>Console</span></a><nav class="nav" aria-label="Navegación de RelNet">${nav}</nav><div class="sidebar-foot"><small>USER CONTROL PLANE</small><strong>Tenant scoped</strong><small>API + MCP → Northbound</small></div></aside><div class="workspace"><header class="topbar"><div><span class="breadcrumb">console.relnets.com</span><strong>${esc(title)}</strong></div><div class="topmeta"><span class="badge">RelNet</span><a href="https://auth.relnets.com/access">Cuenta</a></div></header><main id="main-content" class="content"><div class="hero"><div><span class="eyebrow">Authenticated user console</span><h1>${esc(title)}</h1><p>Una sola superficie para tu identidad, tu red y tus nodos. La autoridad vive en Auth + Northbound, no en el navegador.</p></div></div>${bodyFor(key)}</main><footer class="footer">ReLead · RelNet Console · user-plane</footer></div></div>${clientScript()}</body></html>`;
}
