import { describe, expect, it } from 'vitest';
import { GET } from '../app/route';
describe('root routing',()=>{it('redirects app root permanently to the official landing',async()=>{const response=await GET();expect(response.status).toBe(308);expect(response.headers.get('location')).toBe('https://relead.com.mx');});});
