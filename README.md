# ReLead-App — RelNet User Console

Canonical authenticated user surface for RelNet.

## Public surfaces

- `https://console.relead.com.mx/dashboard` — browser UI
- `https://console.relead.com.mx/v2` — user REST API resource
- `https://console.relead.com.mx/mcp` — public user MCP resource
- `https://auth.relead.com.mx` — central OAuth/OIDC Authorization Server

The Console is **user-plane only**. Builder/admin infrastructure is not part of this application.

## Architecture

```text
Landing / relead.com.mx
        |
        v
Auth-Identity / auth.relead.com.mx
        |
        v
Console / console.relead.com.mx
        |
   +----+----+
   |         |
  /v2       /mcp
   |         |
   +----+----+
        v
Control Edge Northbound
        |
  Controller fleet
        |
Control Edge Southbound
        |
   User RelNets
```

`/v2` and `/mcp` are two adapters to the **same RelNet control-plane/domain layer**. Neither interface selects controllers itself.

## Authentication

The browser uses central Auth with Authorization Code + PKCE and fixed client `relead-console`.

Canonical resources:

- API: `https://console.relead.com.mx/v2`
- MCP: `https://console.relead.com.mx/mcp`

The dashboard stores its short-lived user access token only in the `__Host-relead_console_at` HttpOnly/Secure/SameSite=Lax cookie.

MCP requires an explicit `Authorization: Bearer ...` header and **must never inherit the dashboard cookie**.

`platform:*` is not a Console/user-plane scope. It belongs only to Builder.

## Northbound integration

Required runtime variable once the Control Edge Northbound has a verified origin:

```text
RELNET_NORTHBOUND_ORIGIN=https://<verified-northbound-origin>
```

Requirements:

- HTTPS only.
- Do not include `/v2` or `/mcp` in the variable; the incoming canonical path is preserved.
- Both `/v2/*` and `/mcp*` use this same origin.
- Cookies are stripped before proxying to Northbound.
- The verified bearer is forwarded through `Authorization`.
- If this variable is absent or invalid, `/v2` and `/mcp` fail closed with `503`.

Do **not** configure a placeholder origin. Wait for the Northbound deployment to provide a real health-checked endpoint.

## Local user Console routes

The current tenant-scoped UI exposes:

- `/dashboard` → overview
- `/dashboard/network` → user's network
- `/dashboard/nodes` → user's nodes
- `/dashboard/access` → authorized access surface
- `/dashboard/billing` → plan/entitlements view

Internal render paths remain under `/console/*` for compatibility inside this repository.

The Console intentionally does **not** expose:

- controller fleet administration
- global Edge management
- Builder
- rescue/browser/terminal administration
- infrastructure deployments
- global diagnostics
- `platform:*`

Requests for `/admin` or `/admin/*` are not canonicalized into the user Console.

## Policy boundary

The browser never grants capabilities. Effective authorization belongs server-side and combines:

```text
OAuth scope
+ authenticated identity
+ tenant/network ownership
+ subscription status
+ plan entitlement
+ operation policy
= allow / deny
```

Northbound revalidates the bearer and resolves the actual Space/network context.

## Transitional compatibility

A limited set of historical routes still exists while migration completes (`/console/api/*`, `/api/v1/*`, `/relnet/v1/*`, install and websocket compatibility paths). These are not the canonical `/v2` or `/mcp` implementation.

`BACKEND_ORIGIN` and `CONSOLE_UI_ORIGIN` are compatibility variables only. New RelNet functionality must use Northbound instead of extending those legacy adapters.

## Deployment gate

Do not promote this branch to production until all of the following are true:

1. `auth.relead.com.mx` discovery, JWKS and health are healthy.
2. Control Edge Northbound provides a verified HTTPS origin.
3. `RELNET_NORTHBOUND_ORIGIN` is configured for the intended Vercel environment.
4. `/v2` and `/mcp` E2E authorization tests pass against Northbound.
5. GitHub CI and Vercel Preview are green.

Current production deployment may remain on the older compatibility Console until this gate is satisfied.
