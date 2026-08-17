(() => {
  const body = document.body;
  const toggle = document.getElementById('sidebar-toggle');
  const mobile = () => window.matchMedia('(max-width: 760px)').matches;
  const key = 'relead:relnet-console:sidebar-collapsed';

  const sync = () => {
    if (!toggle) return;
    const open = mobile() ? body.classList.contains('sidebar-open') : !body.classList.contains('sidebar-collapsed');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', mobile()
      ? (open ? 'Cerrar navegación' : 'Abrir navegación')
      : (open ? 'Contraer navegación' : 'Expandir navegación'));
  };

  if (!mobile() && localStorage.getItem(key) === '1') {
    body.classList.add('sidebar-collapsed');
  }

  toggle?.addEventListener('click', () => {
    if (mobile()) {
      body.classList.toggle('sidebar-open');
    } else {
      body.classList.toggle('sidebar-collapsed');
      localStorage.setItem(key, body.classList.contains('sidebar-collapsed') ? '1' : '0');
    }
    sync();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && body.classList.contains('sidebar-open')) {
      body.classList.remove('sidebar-open');
      sync();
    }
  });

  window.addEventListener('resize', () => {
    if (!mobile()) body.classList.remove('sidebar-open');
    sync();
  });

  sync();
})();
