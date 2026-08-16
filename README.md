# ReLead-App

Aplicación web autenticada de RelNet v90 para Cloudflare Workers. Destino final: `app.relead.com.mx`, conforme al contrato v90 de User-Isolated Spaces.

## Estado de migración

- `/admin/*` y `/console/*` se sirven en el Worker y conservan el contrato legacy del Controller durante la transición.
- `/admin/auth` y `/console/auth` son aliases de compatibilidad al login actual mientras la identidad Space-bound queda integrada.
- `/admin` seguirá restringido a administración de plataforma; `/console` será la superficie de usuario aislada por Space.
- Cookies HttpOnly, CSRF, reautenticación y autorización permanecen server-side; no se copian secretos al navegador.
- El proxy sólo permite `/admin*` y `/console*`; no expone MCP ni otras rutas internas.
- El tema reutiliza los tokens claro/oscuro de `relead.com.mx`.

## Gate de producción

Este repo puede desplegarse a `workers.dev` para preview. El dominio `app.relead.com.mx` no debe adjuntarse hasta superar bootstrap e isolation negativa Space A/B, API/MCP/runtime, HA, reconciliación final v89/branding y el release gate v90.
