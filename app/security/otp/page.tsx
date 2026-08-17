'use client';
import { FormEvent, useEffect, useState } from 'react';
import { Surface } from '@/app/components/Surface';

type Session = { csrf?: string; mfa_enabled?: boolean };
type Setup = { secret?: string; otpauth_uri?: string; issuer?: string; digits?: number; period?: number };

export default function OtpPage() {
  const [session, setSession] = useState<Session>({}); const [enabled, setEnabled] = useState(false);
  const [setup, setSetup] = useState<Setup | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { (async () => {
    const s = await fetch('/console/api/session', { cache: 'no-store' }); if (s.status === 401) { location.replace('/console/login'); return; }
    const value = await s.json(); setSession(value); setEnabled(Boolean(value.mfa_enabled));
  })().catch(() => setError('No fue posible consultar la sesión.')); }, []);
  async function begin() {
    setBusy(true); setError(''); const r = await fetch('/console/api/mfa/totp/setup', { method: 'POST', headers: { 'X-CSRF-Token': session.csrf || '' } });
    const p = await r.json().catch(() => ({})); if (!r.ok) setError(String(p.detail || 'No fue posible iniciar TOTP.')); else setSetup(p); setBusy(false);
  }
  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); const form = new FormData(event.currentTarget);
    const r = await fetch('/console/api/mfa/totp/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': session.csrf || '' }, body: JSON.stringify({ code: form.get('code') }) });
    const p = await r.json().catch(() => ({})); if (!r.ok) setError(String(p.detail || 'Código inválido.')); else { setEnabled(true); setSetup(null); } setBusy(false);
  }
  async function disable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); const form = new FormData(event.currentTarget);
    const r = await fetch('/console/api/mfa/totp', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': session.csrf || '' }, body: JSON.stringify({ code: form.get('code') }) });
    const p = await r.json().catch(() => ({})); if (!r.ok) setError(String(p.detail || 'No fue posible desactivar TOTP.')); else setEnabled(false); setBusy(false);
  }
  return <Surface eyebrow="Seguridad" title="TOTP por identidad." description="El secreto se entrega sólo durante el alta. ReLead lo guarda cifrado y bloquea la reutilización del mismo código temporal.">
    <div className="grid-2">
      <section className="card stack"><div><span className="pill">{enabled ? 'TOTP activo' : 'TOTP pendiente'}</span><h2>Autenticador</h2><p className="helper">Compatible con aplicaciones TOTP estándar. El código cambia cada 30 segundos.</p></div>
        {error && <div className="error">{error}</div>}
        {!enabled && !setup && <button className="button primary" onClick={begin} disabled={busy}>{busy ? 'Preparando…' : 'Configurar TOTP'}</button>}
        {setup && <><div className="notice"><strong>Guarda este secreto ahora.</strong><br/>No volverá a mostrarse después de confirmar.</div><div className="code-block">{setup.secret}</div><details><summary>URI otpauth</summary><div className="code-block">{setup.otpauth_uri}</div></details><form className="stack" onSubmit={confirm}><label className="field">Código de 6 dígitos<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required /></label><button className="button primary" disabled={busy}>Confirmar TOTP</button></form></>}
        {enabled && <form className="stack" onSubmit={disable}><label className="field">Código actual <span>Necesario para desactivar MFA</span><input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required /></label><button className="button danger" disabled={busy}>Desactivar TOTP</button></form>}
      </section>
      <aside className="card flat stack"><h2>Modelo de seguridad</h2><div className="metric"><small>Secreto</small><strong>Cifrado</strong><span className="helper">Fernet con clave de runtime, nunca incluido en respuestas después del setup.</span></div><div className="metric"><small>Replay</small><strong>Bloqueado</strong><span className="helper">Cada step TOTP se consume atómicamente.</span></div><div className="metric"><small>Sesión</small><strong>HttpOnly</strong><span className="helper">El bearer no queda disponible para JavaScript.</span></div></aside>
    </div>
  </Surface>;
}
