# ReLead-App v90 preview status

## Cloudflare preview
- Worker: `relead-app-v90-preview`
- Preview: `https://relead-app-v90-preview.ricardomartinez.workers.dev`
- Production target after v90 gates: `app.relead.com.mx`
- Backend origin: `https://api.relead.com.mx`

## Verified migration behavior
- `/` returns HTTP 308 to `https://relead.com.mx`.
- `/admin/auth` and `/console/auth` render the existing login surface through the Worker.
- Existing `/admin/*` and `/console/*` assets/APIs remain same-origin through the bounded compatibility BFF.
- HTML receives the ReLead theme; the existing controller `app.js` remains unchanged.
- Login CSRF cookie remains `HttpOnly`, `Secure`, `SameSite=strict`.
- Worker normalizes browser `Origin`/`Referer` to the backend origin before server-side CSRF checks.
- `/mcp` is deliberately not proxied by this compatibility bridge.

## Production blockers from authoritative v90 contract
Do not attach `app.relead.com.mx` yet. Required gates still include canonical application authentication bound to `user_id` + default `space_id`; `/console` restricted to that Space; `/admin` restricted to `platform_admin`; negative Space A/B tests across API/MCP/DB/nodes/RelDrop/RelShare/SSH/Exit/Subnet/mobile/runtimes; HA/front-door validation; and final v89 + Landing reconciliation/release cutoff.

The preview preserves the legacy UI while the Space-bound backend contract is completed; it is not proof of cross-Space isolation.
