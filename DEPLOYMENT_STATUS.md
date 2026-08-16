# ReLead-App v90 preview status

## Cloudflare preview

- Worker: `relead-app-v90-preview`
- Preview: `https://relead-app-v90-preview.ricardomartinez.workers.dev`
- Production target after v90 gates: `app.relead.com.mx`
- Backend origin: `https://api.relead.com.mx`

## Verified migration behavior

- `/` returns HTTP 308 to `https://relead.com.mx`.
- `/admin/auth` and `/console/auth` render the existing authenticated login surface through the Worker.
- Existing `/admin/*` and `/console/*` assets/APIs remain same-origin through the bounded BFF compatibility bridge.
- HTML receives the ReLead theme; the existing controller `app.js` remains unchanged.
- Login CSRF cookie remains `HttpOnly`, `Secure`, `SameSite=strict`.
- Worker normalizes browser `Origin`/`Referer` to the backend origin before server-side CSRF checks.
- `/mcp` is deliberately not proxied by this compatibility bridge.

## Production blockers from authoritative v90 contract

Do not attach `app.relead.com.mx` yet. Required gates still include:

1. canonical application authentication bound to `user_id` + default `space_id`;
2. `/console` authorization restricted to the authenticated Space;
3. `/admin` authorization restricted to `platform_admin`;
4. negative Space A/B tests for API, MCP, DB, nodes, RelDrop/RelShare, SSH, Exit/Subnet, mobile and runtimes;
5. Controller HA/front-door validation;
6. final v89 production + Landing branding reconciliation and release cutoff.

The current preview intentionally preserves the legacy UI while the Space-bound backend contract is completed; it must not be mistaken for proof of cross-Space isolation.
