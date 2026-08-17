import { NextRequest, NextResponse } from 'next/server';

export const SESSION_COOKIE = 'relead_session';
export const CSRF_COOKIE = 'relead_csrf';
export const EMAIL_COOKIE = 'relead_identity_email';
export const SESSION_MAX_AGE = 60 * 60 * 12;

export function cookieSecure(): boolean {
  return process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production';
}

export function backendOrigin(): string {
  return (process.env.BACKEND_ORIGIN || 'https://api.relead.com.mx').replace(/\/+$/, '');
}

export function bearerFrom(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE)?.value || null;
}

export function emailFrom(request: NextRequest): string | null {
  return request.cookies.get(EMAIL_COOKIE)?.value || null;
}

export function assertSameOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ detail: 'cross-origin request rejected' }, { status: 403 });
  }
  return null;
}

export function assertCsrf(request: NextRequest): NextResponse | null {
  const expected = request.cookies.get(CSRF_COOKIE)?.value || '';
  const provided = request.headers.get('x-csrf-token') || '';
  if (!expected || !provided || expected !== provided) {
    return NextResponse.json({ detail: 'invalid CSRF token' }, { status: 403 });
  }
  return null;
}

export async function backendFetch(
  path: string,
  init: RequestInit = {},
  bearer?: string | null,
): Promise<Response> {
  const headers = new Headers(init.headers || {});
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (bearer) headers.set('Authorization', `Bearer ${bearer}`);
  return fetch(`${backendOrigin()}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
    redirect: 'manual',
  });
}

export async function responseJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const value = await response.json();
    return value && typeof value === 'object' ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export async function relayJson(response: Response): Promise<NextResponse> {
  const body = await responseJson(response);
  return NextResponse.json(body, { status: response.status });
}

export function setSessionCookies(
  response: NextResponse,
  sessionValue: string,
  email: string,
  csrfValue: string,
): void {
  const secure = cookieSecure();
  const base = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/', maxAge: SESSION_MAX_AGE };
  response.cookies.set(SESSION_COOKIE, sessionValue, base);
  response.cookies.set(EMAIL_COOKIE, email, base);
  response.cookies.set(CSRF_COOKIE, csrfValue, { ...base, sameSite: 'strict' });
}

export function clearSessionCookies(response: NextResponse): void {
  for (const name of [SESSION_COOKIE, EMAIL_COOKIE, CSRF_COOKIE]) {
    response.cookies.set(name, '', { httpOnly: true, secure: cookieSecure(), sameSite: 'lax', path: '/', maxAge: 0 });
  }
}

export function requireBearer(request: NextRequest): string | NextResponse {
  const bearer = bearerFrom(request);
  return bearer || NextResponse.json({ detail: 'authentication required' }, { status: 401 });
}
