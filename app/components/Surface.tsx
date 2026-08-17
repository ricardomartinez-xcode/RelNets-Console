import Link from 'next/link';

export function Surface({
  eyebrow, title, description, children, compact = false,
}: Readonly<{ eyebrow: string; title: string; description: string; children: React.ReactNode; compact?: boolean }>) {
  return (
    <main className="surface-page">
      <div className="surface-glow" aria-hidden="true" />
      <header className="surface-topbar">
        <Link className="wordmark" href="/console/" aria-label="RelNet Console">
          <span className="wordmark-mark">R</span><span>ReLead</span><b>RelNet Console</b>
        </Link>
        <nav className="surface-nav" aria-label="Cuenta">
          <Link href="/console/">Console</Link><Link href="/billing">Planes</Link>
          <Link href="/security/otp">Seguridad</Link><Link href="/developers">API/MCP</Link>
        </nav>
      </header>
      <section className={compact ? 'surface-shell compact' : 'surface-shell'}>
        <div className="surface-heading"><span className="surface-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
        {children}
      </section>
      <footer className="surface-footer"><span>ReLead · RelNet v90</span><a href="https://relead.com.mx">relead.com.mx</a></footer>
    </main>
  );
}
