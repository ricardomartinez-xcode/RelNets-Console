'use client';
import { useEffect, useState } from 'react';
import { Surface } from '@/app/components/Surface';
const api = 'https://api.relead.com.mx';
export default function DevelopersPage() {
  const [plan, setPlan] = useState('');
  useEffect(() => { fetch('/console/api/session', { cache: 'no-store' }).then(async (r) => { if (r.status === 401) { location.replace('/console/login'); return; } const p = await r.json(); setPlan(String(p.role || 'Free')); }).catch(() => undefined); }, []);
  return <Surface eyebrow="Developers" title="Un solo OAuth para API y MCP." description="api.relead.com.mx es el resource server y authorization server canónico. Console sólo administra tu identidad y tus accesos.">
    <div className="grid-2">
      <section className="card stack"><div><span className="pill">Plan {plan || '—'}</span><h2>Endpoints canónicos</h2></div><div className="code-block">{`${api}/mcp\n${api}/oauth/authorize\n${api}/oauth/token\n${api}/oauth/register\n${api}/oauth/revoke\n${api}/.well-known/oauth-protected-resource\n${api}/.well-known/oauth-authorization-server\n${api}/.well-known/openid-configuration`}</div><p className="helper">Los clientes MCP descubren OAuth desde el resource metadata. No necesitas `app.relead.com.mx` como intermediario.</p></section>
      <aside className="card flat stack"><h2>Scopes y plan</h2><div className="metric"><small>RelNet lectura</small><strong>relnet:read</strong></div><div className="metric"><small>RelNet escritura</small><strong>relnet:write</strong></div><div className="metric"><small>API externa</small><strong>Pro+</strong><span className="helper">Las credenciales externas requieren `api_access`; la sesión de Console sigue limitada a tu Space.</span></div><a className="button primary" href={`${api}/.well-known/oauth-protected-resource`} target="_blank" rel="noreferrer">Ver metadata OAuth</a></aside>
    </div>
  </Surface>;
}
