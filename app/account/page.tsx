'use client';
import { useEffect, useState } from 'react';
import { Surface } from '@/app/components/Surface';
type Session = { user_id?: string; space_id?: string; network_id?: string; role?: string; mfa_enabled?: boolean; usage?: Record<string, unknown>; plan?: Record<string, unknown> };
export default function AccountPage() {
  const [data, setData] = useState<Session | null>(null); const [error, setError] = useState('');
  useEffect(() => { fetch('/console/api/session', { cache: 'no-store' }).then(async (r) => { if (r.status === 401) { location.replace('/console/login'); return; } if (!r.ok) throw new Error('No fue posible cargar la cuenta.'); setData(await r.json()); }).catch((e) => setError(e.message)); }, []);
  return <Surface eyebrow="Cuenta" title="Tu identidad y tu Space." description="Console opera únicamente sobre esta identidad, su red RelNet y los entitlements del plan activo.">
    {error && <div className="error">{error}</div>}
    {!data ? <div className="card">Cargando identidad…</div> : <div className="grid-2">
      <section className="card stack"><span className="pill">Plan {data.role || 'Free'}</span><div className="metric"><small>User ID</small><strong style={{fontSize:18}}>{data.user_id}</strong></div><div className="metric"><small>Space ID</small><strong style={{fontSize:18}}>{data.space_id}</strong></div><div className="metric"><small>Network ID</small><strong style={{fontSize:18}}>{data.network_id}</strong></div></section>
      <aside className="card flat stack"><h2>Accesos</h2><a className="button secondary" href="/console/">Abrir RelNet Console</a><a className="button secondary" href="/security/otp">Seguridad y TOTP</a><a className="button secondary" href="/billing">Facturación y plan</a><a className="button secondary" href="/developers">API y MCP</a><p className="helper">MFA: {data.mfa_enabled ? 'activo' : 'no configurado'}.</p></aside>
    </div>}
  </Surface>;
}
