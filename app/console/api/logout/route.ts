import { NextRequest, NextResponse } from 'next/server';
import { assertCsrf, assertSameOrigin, backendFetch, bearerFrom, clearSessionCookies } from '@/app/lib/backend';
export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request); if (originError) return originError;
  const csrfError = assertCsrf(request); if (csrfError) return csrfError;
  const bearer = bearerFrom(request);
  if (bearer) await backendFetch('/auth/app/logout', { method: 'POST' }, bearer).catch(() => undefined);
  const result = new NextResponse(null, { status: 204 }); clearSessionCookies(result); return result;
}
