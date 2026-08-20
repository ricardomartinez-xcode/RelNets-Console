import { backendFetch, relayJson } from '@/app/lib/backend';
export async function GET() { return relayJson(await backendFetch('/api/v1/billing/plans')); }
