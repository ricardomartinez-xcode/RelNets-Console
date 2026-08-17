'use client';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Surface } from '@/app/components/Surface';

export default function LoginPage() {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { fetch('/console/api/session', { cache: 'no-store' }).then((r) => { if (r.ok) location.replace('/console/'); }).catch(() => undefined); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/console/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), credential: form.get('credential'), totp: form.get('totp') || '' }) });
    if (response.ok) { location.replace('/console/'); return; }
    const payload = await response.json().catch(() => ({})); setError(String(payload.detail || 'No fue posible iniciar sesión.')); setBusy(false);
  }
  return <Surface compact eyebrow="Identidad ReLead" title="Entra a tu RelNet." description="Tu sesión abre únicamente tu Space. Si activaste TOTP, usa el código vigente de tu autenticador.">
    <form className="card stack" onSubmit={submit}>
      {error && <div className="error" role="alert">{error}</div>}
      <label className="field">Correo electrónico<input name="email" type="email" autoComplete="email" required /></label>
      <label className="field">Contraseña<input name="credential" type="password" autoComplete="current-password" required /></label>
      <label className="field">Código TOTP <span>Opcional si todavía no activaste MFA</span><input name="totp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} /></label>
      <button className="button primary" disabled={busy}>{busy ? 'Verificando…' : 'Abrir RelNet Console'}</button>
      <p className="helper">¿Aún no tienes cuenta? <Link href="/register">Crear cuenta</Link> · <a href="https://relead.com.mx">Volver a ReLead</a></p>
    </form>
  </Surface>;
}
