# ReLead-App

Transitional edge compatibility layer for ReLead v90.

## Canonical surfaces

- Public: `https://relead.com.mx`
- RelNet Console: `https://console.relead.com.mx`
- Backend/API: `https://api.relead.com.mx`

## Temporary console-alias bridge

`console.relead.com.mx` is currently attached to this deployment while the real Console UI is built by `ReLead-Control-Web` and exposed at `https://admin.relead.com.mx`. Redirecting graphical requests to `console.relead.com.mx` from this project would therefore loop back into itself.

Until the custom domain is reassigned to the Control Web project, this edge **proxies graphical Console routes internally** to `CONSOLE_UI_ORIGIN` (default `https://admin.relead.com.mx`) while the browser remains on `console.relead.com.mx`.

Backend routes (`/admin/api/*`, `/console/api/*`, `/api/v1/*`, `/relnet/v1/*`, `/auth/*`, `/oauth/*`, `/install/*`, `/ws/*`) continue to go directly to `BACKEND_ORIGIN` (default `https://api.relead.com.mx`). Registration and OTP remain legacy UI routes. `/billing` is now a local fail-closed RelNet Product Console surface; live billing truth still requires an authoritative server-side Product API contract.

This bridge is temporary. The final architecture is to assign `console.relead.com.mx` directly to `ReLead-Control-Web`, then retire the UI-proxy behavior from this repo.

## RelNet Next Console UI

The authenticated human surface is `https://console.relead.com.mx`. This workstream is UI-only: it does not implement networking, billing business logic, AI scheduling, Product PostgreSQL or entitlement decisions.

Local product routes:
- `/console/relnet`
- `/console/relnet/controllers`
- `/console/relnet/nodes`
- `/console/relnet/edge`
- `/console/relnet/network`
- `/console/relnet/access`
- `/console/relnet/installation`
- `/console/relnet/diagnostics`
- `/console/relnet/migration`
- `/console/relnet/ai`
- `/billing`

The current contract audit used official `next/integration` HEAD `366678973bc843392fce404507f03ea2da74b8e5`, plus the delegated Agent-5/Agent-7 coordination contract. NetworkMap, path, Relay capacity and Service Stream semantics come from the current `next/contracts/**` files.

Product AI UI is deliberately provider-neutral. The delegated commercial contract fixes Free as not included/0 AI Credits, Pro at 100 AI Credits/month, Team at a pooled 500/month, and Business at a bounded contractual/configurable quota. Credits are never translated into hours, tokens or provider units. Effective plan, paid subscription, revenue gate, entitlement, reservations and usage remain server-side truth.

`commercial/contracts/public-plans.json` at the audited integration HEAD has not yet incorporated the delegated pricing/AI revision, so this branch does not render contradictory plan prices. `/billing` remains fail-closed until the canonical commercial endpoint is integrated.

Authentication remains an integration boundary of the existing Console front door. The current source contract does not define a new `/console/relnet` session-validation endpoint, so this task does not invent one. The isolated Vercel Preview must remain access-protected, and production promotion must preserve an authenticated Console boundary.
