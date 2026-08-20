import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  CSRF_COOKIE, backendFetch, bearerFrom, clearSessionCookies, cookieSecure, responseJson,
  setSessionCookies,
} from './backend';

export function newCsrf(): string {
  return randomBytes(24).toString('base64url');
}

export async function establishSession(
  request: NextRequest,
  payload: Record<string, unknown>,
  endpoint: '/auth/app/login' | '/auth/app/register',
): Promise<NextResponse> {
  const email = String(payload.email || '').trim().toLowerCase();
  const response = await backendFetch(endpoint, { method: 'POST', body: JSON.stringify(payload) });
  const body = await responseJson(response);
  if (!response.ok) return NextResponse.json(body, { status: response.status });
  const sessionValue = String(body.session_value || '');
  if (!sessionValue.startsWith('rsess_')) {
    return NextResponse.json({ detail: 'invalid authentication response' }, { status: 502 });
  }
  const safeBody = { ...body };
  delete safeBody.session_value;
  const csrf = newCsrf();
  const result = NextResponse.json({ ...safeBody, csrf }, { status: response.status });
  setSessionCookies(result, sessionValue, email, csrf);
  return result;
}

export async function sessionSummary(request: NextRequest): Promise<NextResponse> {
  const bearer = bearerFrom(request);
  if (!bearer) return NextResponse.json({ detail: 'authentication required' }, { status: 401 });
  const [authResponse, billingResponse] = await Promise.all([
    backendFetch('/auth/app/session', {}, bearer),
    backendFetch('/api/v1/billing/me', {}, bearer),
  ]);
  if (!authResponse.ok) {
    const result = NextResponse.json(await responseJson(authResponse), { status: authResponse.status });
    if (authResponse.status === 401) clearSessionCookies(result);
    return result;
  }
  const auth = await responseJson(authResponse);
  const billing = billingResponse.ok ? await responseJson(billingResponse) : {};
  const plan = billing.plan && typeof billing.plan === 'object' ? billing.plan as Record<string, unknown> : {};
  let csrf = request.cookies.get(CSRF_COOKIE)?.value || '';
  if (!csrf) csrf = newCsrf();
  const result = NextResponse.json({
    ...auth,
    actor: String(billing.user_id || auth.user_id || 'Usuario ReLead'),
    role: String(plan.name || plan.slug || 'Free'),
    session_expires_in_seconds: 60 * 60 * 12,
    csrf,
    plan,
    usage: billing.usage || {},
    billing_state: billing.billing || null,
  });
  if (!request.cookies.get(CSRF_COOKIE)?.value) {
    result.cookies.set(CSRF_COOKIE, csrf, { httpOnly: true, secure: cookieSecure(), sameSite: 'strict', path: '/', maxAge: 60 * 60 * 12 });
  }
  return result;
}
