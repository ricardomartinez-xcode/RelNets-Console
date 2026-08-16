# ReLead v90 — separación de superficies y “My RelNet”

Fecha: 2026-08-16
Estado: diseño aprobado en conversación; pendiente revisión final del documento antes del plan de implementación.

## Objetivo

Separar v90 en cuatro superficies con responsabilidades y fronteras de seguridad claras, manteniendo compatibilidad durante la transición desde las rutas actuales.

## Arquitectura canónica

### 1. `relead.com.mx` — superficie pública y comercial

Responsabilidad: marketing, información pública, conversión y contenido legal. No debe exponer nodos, infraestructura, tokens, OAuth Apps ni datos operativos.

Rutas canónicas iniciales:

- `/`
- `/price`
- `/FAQs`
- `/terms`
- `/policy`
- `/auth/login` → redirect a `https://app.relead.com.mx/auth/login`
- `/auth/signup` → redirect a `https://app.relead.com.mx/auth/signup`

Compatibilidad pública:

- `/faqs` → `/FAQs`
- `/privacy` → `/policy`
- `/sign-up` → `/auth/signup`

### 2. `app.relead.com.mx` — “My RelNet”

Responsabilidad: aplicación del cliente y centro de cuenta. La marca visible de esta superficie será **My RelNet**.

Rutas objetivo:

- `/` → `/dashboard`
- `/auth`
- `/auth/login`
- `/auth/signup`
- `/dashboard`
- `/account`
- `/account/security`
- `/account/sessions`
- `/account/devices`
- `/relnet`
- `/relnet/nodes`
- `/relnet/subnets`
- `/relnet/exit-nodes`
- `/relnet/reldrop`
- `/relnet/relshare`
- `/integrations`
- `/developers`
- `/developers/oauth`
- `/developers/oauth/{app}`
- `/usage`
- `/billing`

La autorización debe resolverse por usuario, organización/workspace, rol, permisos y plan. Los usuarios no administradores nunca deben depender de la consola interna.

### 3. `console.relead.com.mx` — administración interna del sistema

Responsabilidad: reemplazar y reunificar las superficies administrativas actuales `/admin` y `/console` en una sola consola interna.

Rutas objetivo:

- `/` → `/dashboard`
- `/auth`
- `/auth/login`
- `/auth/mfa`
- `/dashboard`
- `/users`
- `/organizations`
- `/subscriptions`
- `/oauth`
- `/relnet`
- `/relnet/nodes`
- `/relnet/controllers`
- `/relnet/subnets`
- `/relnet/exit-nodes`
- `/infrastructure`
- `/integrations`
- `/releases`
- `/jobs`
- `/audit`
- `/system`

Esta superficie exige sesión administrativa independiente, autorización administrativa, auditoría reforzada y MFA/reautenticación para acciones sensibles.

### 4. `api.relead.com.mx` — backend solamente

Responsabilidad: API, Authorization Server OAuth, MCP, WebSocket y servicios backend. No será la ubicación canónica de interfaces HTML de usuario o administración.

Superficies backend esperadas:

- APIs versionadas
- `/oauth/*`
- `/.well-known/*`
- `/mcp`
- `/ws/*`
- endpoints internos autorizados

## Identidad y sesiones

- `app.relead.com.mx` y `console.relead.com.mx` NO compartirán cookie de sesión.
- Las sesiones serán host-only usando cookies `__Host-*`, `Secure`, `HttpOnly` y `SameSite` apropiado.
- Una misma identidad ReLead podrá tener simultáneamente una sesión normal en My RelNet y una sesión administrativa independiente en Console.
- La sesión administrativa debe poder exigir MFA/reautenticación aunque la sesión normal ya exista.
- OAuth 2.1 de ReLead permanecerá en `api.relead.com.mx` y se generalizará para soportar OAuth Apps administradas desde My RelNet.

## OAuth Apps

“My RelNet” expondrá `/developers/oauth` para administrar aplicaciones OAuth del usuario/organización.

Tipos de cliente:

- `public`: Authorization Code + PKCE, sin `client_secret`; apropiado para RelNet Desktop, CLI y apps móviles.
- `confidential`: `client_id` + `client_secret`; apropiado para servicios server-side capaces de custodiar secretos.

Requisitos:

- ownership por usuario/organización/workspace;
- redirect URIs configurables y validadas;
- scopes explícitos;
- secrets mostrados una sola vez y almacenados únicamente como hash;
- rotación, revocación, última utilización y auditoría;
- ChatGPT continúa compatible como cliente OAuth existente sin romper el flujo actual.

## Migración desde las superficies actuales

Estado observado al 2026-08-16:

- `ReLead-Control-Web` todavía contiene `public/admin` y `public/console` y hace proxy hacia `api.relead.com.mx`.
- `ReLead-App` rama `feat/v90-authenticated-control-plane` ya contiene el scaffold autenticado y pruebas diseñadas alrededor de `app.relead.com.mx`.

Migración:

1. Convertir `ReLead-App` en la superficie canónica de My RelNet.
2. Mantener `Landing` como `relead.com.mx`, limitando sus responsabilidades a contenido público/comercial y redirects de auth.
3. Reutilizar/migrar las funciones administrativas actuales de `/admin` y `/console` hacia `console.relead.com.mx`.
4. Mantener temporalmente redirects de compatibilidad para las rutas visuales antiguas.
5. Migrar llamadas frontend a endpoints backend canónicos en `api.relead.com.mx` y eliminar progresivamente el proxy HTML heredado.
6. Una vez verificada la ausencia de consumidores antiguos, retirar las superficies HTML de `/admin` y `/console` en `api.relead.com.mx`.

Compatibilidad objetivo durante transición:

- `https://api.relead.com.mx/admin/*` → `https://console.relead.com.mx/*`
- `https://api.relead.com.mx/console/*` → `https://console.relead.com.mx/*`

Los redirects sólo aplican a superficies visuales. Las APIs no deben redirigirse de forma ambigua; deben conservar contratos backend explícitos.

## Fronteras de seguridad

- `relead.com.mx`: contenido público; no sesiones privilegiadas.
- `app.relead.com.mx`: datos y acciones del usuario dentro de su ámbito autorizado.
- `console.relead.com.mx`: operaciones privilegiadas de plataforma.
- `api.relead.com.mx`: backend; toda operación protegida requiere autorización válida.
- CORS, CSP, CSRF, cookies y redirect URIs deben configurarse por superficie; no usar comodines entre subdominios.
- No compartir secretos, tokens ni sesión administrativa mediante frontend público.
- Las acciones sensibles de Console deben quedar asociadas al actor y registradas en audit log.

## Branding

- **ReLead**: marca/plataforma y sitio público.
- **RelNet**: producto principal de red privada.
- **My RelNet**: nombre visible de la aplicación del usuario en `app.relead.com.mx`.
- **ReLead Console**: nombre recomendado para la consola administrativa interna en `console.relead.com.mx`.

## Criterios de aceptación de v90

1. `relead.com.mx` no contiene superficies operativas privadas.
2. login/signup públicos desembocan en `app.relead.com.mx`.
3. My RelNet ofrece dashboard, cuenta y RelNet bajo sesión multiusuario aislada.
4. `console.relead.com.mx` contiene la administración reunificada y requiere privilegios administrativos.
5. `api.relead.com.mx` funciona como backend canónico y no como frontend primario.
6. app y console usan sesiones host-only independientes.
7. OAuth existente de ChatGPT permanece funcional.
8. OAuth Apps del usuario quedan integradas al modelo multiusuario de v90.
9. existen redirects de compatibilidad probados para las superficies visuales heredadas.
10. pruebas de auth, routing, CORS/CSRF, roles y regresión pasan antes de promoción.

## Fuera de alcance de este diseño

- definir precios finales de los planes;
- elegir proveedor de cobro definitivo;
- rediseñar capacidades internas de RelNet que no dependan de la separación de superficies;
- modificar el protocolo de red de RelNet.
