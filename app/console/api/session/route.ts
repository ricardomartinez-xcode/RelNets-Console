import { NextRequest } from 'next/server';
import { sessionSummary } from '@/app/lib/session';
export async function GET(request: NextRequest) { return sessionSummary(request); }
