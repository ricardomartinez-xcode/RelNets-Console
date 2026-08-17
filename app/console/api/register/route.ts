import { NextRequest } from 'next/server';
import { assertSameOrigin } from '@/app/lib/backend';
import { establishSession } from '@/app/lib/session';
export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request); if (originError) return originError;
  const body = await request.json().catch(() => ({}));
  return establishSession(request, body, '/auth/app/register');
}
