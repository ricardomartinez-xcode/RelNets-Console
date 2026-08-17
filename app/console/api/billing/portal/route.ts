import { NextRequest, NextResponse } from 'next/server';
import { assertCsrf, assertSameOrigin, backendFetch, bearerFrom, relayJson } from '@/app/lib/backend';
export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request); if (originError) return originError;
  const csrfError = assertCsrf(request); if (csrfError) return csrfError;
  const bearer = bearerFrom(request); if (!bearer) return NextResponse.json({ detail: 'authentication required' }, { status: 401 });
  return relayJson(await backendFetch('/api/v1/billing/portal', { method: 'POST', body: '{}' }, bearer));
}
