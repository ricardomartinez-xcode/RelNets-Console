import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { assertCsrf, assertSameOrigin, backendFetch, emailFrom, responseJson, setSessionCookies } from '@/app/lib/backend';
export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request); if (originError) return originError;
  const csrfError = assertCsrf(request); if (csrfError) return csrfError;
  const email = emailFrom(request); if (!email) return NextResponse.json({ detail: 'authentication required' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const response = await backendFetch('/auth/app/login', { method: 'POST', body: JSON.stringify({ email, credential: body.password, totp: body.totp || '' }) });
  const payload = await responseJson(response);
  if (!response.ok) return NextResponse.json(payload, { status: response.status });
  const value = String(payload.session_value || '');
  if (!value.startsWith('rsess_')) return NextResponse.json({ detail: 'invalid authentication response' }, { status: 502 });
  const csrf = randomBytes(24).toString('base64url');
  const result = NextResponse.json({ status: 'reauthenticated', csrf });
  setSessionCookies(result, value, email, csrf); return result;
}
