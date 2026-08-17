# ReLead-App

Transitional edge compatibility layer for ReLead v90.

## Canonical surfaces

- Public: `https://relead.com.mx`
- RelNet Console: `https://console.relead.com.mx`
- Backend/API: `https://api.relead.com.mx`

## Temporary console-alias bridge

`console.relead.com.mx` is currently attached to this deployment while the real Console UI is built by `ReLead-Control-Web` and exposed at `https://admin.relead.com.mx`. Redirecting graphical requests to `console.relead.com.mx` from this project would therefore loop back into itself.

Until the custom domain is reassigned to the Control Web project, this edge **proxies graphical Console routes internally** to `CONSOLE_UI_ORIGIN` (default `https://admin.relead.com.mx`) while the browser remains on `console.relead.com.mx`.

Backend routes (`/admin/api/*`, `/console/api/*`, `/api/v1/*`, `/relnet/v1/*`, `/auth/*`, `/oauth/*`, `/install/*`, `/ws/*`) continue to go directly to `BACKEND_ORIGIN` (default `https://api.relead.com.mx`). Registration, OTP and billing pages are UI routes and are proxied to Control Web so its CSRF/rendering logic remains authoritative.

This bridge is temporary. The final architecture is to assign `console.relead.com.mx` directly to `ReLead-Control-Web`, then retire the UI-proxy behavior from this repo.
