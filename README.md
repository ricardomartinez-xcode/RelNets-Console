# ReLead-App

Legacy edge compatibility layer for ReLead v90.

## Canonical surfaces

- Public: `https://relead.com.mx`
- RelNet Console: `https://console.relead.com.mx`
- Backend/API: `https://api.relead.com.mx`

`app.relead.com.mx` no longer owns a graphical product surface. GET/HEAD requests under `/admin` and `/console` are redirected to **RelNet Console**. During the migration window, legacy `/admin/api/*`, `/console/api/*` and non-GET login/auth requests continue to proxy to the backend so cached clients are not cut off abruptly.

The compatibility window should be removed only after session/cookie migration is verified in staging.
