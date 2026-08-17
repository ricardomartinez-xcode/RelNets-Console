import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, bearerFrom, responseJson } from '@/app/lib/backend';

const QUERY_OPERATIONS = [
  'status', 'nodes', 'peers', 'features', 'drop_transfers', 'pairings',
  'policies', 'topology', 'telemetry', 'commands', 'terminal_sessions', 'routing',
] as const;

export async function GET(request: NextRequest) {
  const bearer = bearerFrom(request);
  if (!bearer) return NextResponse.json({ detail: 'authentication required' }, { status: 401 });
  const sections = await Promise.all(QUERY_OPERATIONS.map(async (operation) => {
    const response = await backendFetch('/api/v1/relnet/query', {
      method: 'POST', body: JSON.stringify({ operation, parameters: {} }),
    }, bearer);
    const data = await responseJson(response);
    return {
      source: '/api/v1/relnet/query', operation,
      data: response.ok ? data : { status: 'unavailable', detail: data.detail || `HTTP ${response.status}` },
    };
  }));
  return NextResponse.json({ module: 'relnet', sections });
}
