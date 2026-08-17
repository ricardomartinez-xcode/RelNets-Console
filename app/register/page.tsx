'use client';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Surface } from '@/app/components/Surface';

export default function RegisterPage() {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const form = new FormData(event.currentTarget); const credential = String(form.get('credential') || '');
    if (credential !== String(form.get('confirm') || '')) { setError('Las contraseñas no coinciden.'); return; }
    if (credential.length < 12) { setError('Usa una contraseña de al menos 12 caracteres.'); return; }
    setBusy(true);
    const response = await fetch('/console/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), display_name: form.get('display_name'), credential }) });
    if (response.ok) { location.replace('/security/otp?new=1'); return; }
    const payload = await response.json().catch(() => ({})); setError(String(payload.detail || 'No fue posible crear la cuenta.')); setBusy(false);
  }
  return <Surface compact eyebrow="Nueva identidad" title="Crea tu Space privado." description="El registro provisiona tu identidad, tu red RelNet y el plan Free. Después puedes activar TOTP y subir de plan sin cambiar de red.">
    <form className="card stack" onSubmit={submit}>
      {error && <div className="error" role="alert">{error}</div>}
      <label className="field">Nombre<input name="display_name" autoComplete="name" required maxLength={120} /></label>
      <label className="field">Correo<input name="email" type="email" autoComplete="email" required /></label>
      <label className="field">Contraseña <span>Mínimo 12 caracteres</span><input name="credential" type="password" autoComplete="new-password" minLength={12} required /></label>
      <label className="field">Confirmar contraseña<input name="confirm" type="password" autoComplete="new-password" minLength={12} required /></label>
      <button className="button primary" disabled={busy}>{busy ? 'Creando Space…' : 'Crear cuenta y RelNet'}</button>
      <p className="helper">Al continuar aceptas los <a href="https://relead.com.mx/terms">Términos</a> y la <a href="https://relead.com.mx/privacy">Privacidad</a>. ¿Ya tienes cuenta? <Link href="/console/login">Iniciar sesión</Link>.</p>
    </form>
  </Surface>;
}
