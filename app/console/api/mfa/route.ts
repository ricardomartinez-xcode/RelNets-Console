import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, bearerFrom, relayJson } from '@/app/lib/backend';
export async function GET(request: NextRequest) {
  const bearer = bearerFrom(request); if (!bearer) return NextResponse.json({ detail: 'authentication required' }, { status: 401 });
  return relayJson(await backendFetch('/auth/app/mfa', {}, bearer));
}
