# Campaña CRM

CRM territorial para campañas políticas. Permite a un equipo de campaña organizar
su estructura (organigrama), cargar votantes manualmente en el territorio, listarlos
según el rol de cada usuario y visualizar su concentración en un mapa de calor.

Pensado mobile-first para uso en la calle (base lista para convertir en PWA).

## Stack

- **Next.js 16** (App Router, React 19, TypeScript)
- **Tailwind CSS v4**
- **Neon Postgres** (PostGIS) vía [`postgres`](https://github.com/porsager/postgres) (postgres.js)
- **Neon Auth** (Better Auth) para autenticación — `@neondatabase/auth`
- **Leaflet + leaflet.heat** para el mapa de calor (tiles de OpenStreetMap, sin API key)

## Modelo de datos (ya existente en Neon)

El esquema vive en el proyecto Neon `metria-campaign-crm` (id `raspy-breeze-56969217`).
Tablas principales usadas por la app:

- `campaigns` — campañas (hay una activa: *Campaña Asunción 2026*).
- `usuarios` — miembros del equipo, con `rol` (`admin`, `jefe_campania`, `coordinador`,
  `referente`, `fiscal`, `analista`) y `auth_provider_id` que enlaza con Neon Auth.
- `territorios` — jerarquía territorial (país → departamento → distrito → zona → barrio → seccional).
- `asignaciones_territoriales` — qué usuario cubre qué territorio (base del organigrama y del alcance).
- `personas` — votantes, con `ubicacion` (PostGIS `geography(Point)`).
- `vinculos_campania` — vínculo persona↔campaña: `etapa` (embudo), `intencion`, `estado_voto`, `referente_id`.

## Roles y visibilidad

- `admin`, `jefe_campania`, `analista` → ven **todos** los votantes de la campaña.
- `coordinador`, `referente`, `fiscal` → ven los votantes de **su territorio asignado**
  (y sus descendientes en el árbol) más los que cargaron ellos mismos.
- `analista` es de solo lectura (no puede cargar votantes).

La lógica de alcance está en [`lib/queries.ts`](lib/queries.ts) (`getScope` + `scopeCondition`,
con un CTE recursivo sobre `territorios`).

## Funcionalidades

- **Inicio** (`/`) — métricas, embudo por etapa e intención, accesos rápidos.
- **Votantes** (`/votantes`) — listado según rol, con búsqueda y filtros por etapa/intención/territorio.
- **Cargar votante** (`/votantes/nuevo`) — alta manual, con captura de ubicación GPS del dispositivo.
- **Mapa** (`/mapa`) — mapa de calor ponderado por etapa e intención de voto.
- **Equipo** (`/organigrama`) — organigrama del equipo por rol con territorios asignados.

## Autenticación

Usa **Neon Auth** (Better Auth). El flujo:

1. Registro/login con email + contraseña (`app/auth/*`).
2. En el primer ingreso, `/onboarding` crea la fila en `usuarios` (nombre, teléfono, rol)
   dentro de la campaña activa y la enlaza al usuario de Neon Auth.
3. La protección de rutas se hace a nivel de página con `requireUsuario()`
   (ver [`lib/session.ts`](lib/session.ts)); el layout `(app)` la aplica a toda la sección privada.

> Nota: no se usa middleware (`proxy.ts`) porque el middleware de Neon Auth interfiere con las
> Server Actions (redirige el POST y provoca "unexpected response"). El guard por página cubre
> la autenticación de forma equivalente.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # y completá los valores (ver más abajo)
npm run dev                  # http://localhost:3000
```

Variables de entorno (`.env.local`):

- `DATABASE_URL` — connection string *pooled* de Neon.
- `NEON_AUTH_BASE_URL` — URL de Neon Auth del branch.
- `NEON_AUTH_COOKIE_SECRET` — secreto de 32+ caracteres (`openssl rand -base64 32`).

## Observabilidad

El formulario público de inscripción a eventos (`/evento/<slug>`) es un endpoint
sin sesión: quien falla ahí no vuelve a avisarnos. Por eso cada envío deja rastro
en dos lugares (ver [`lib/observabilidad.ts`](lib/observabilidad.ts)):

- **Una línea JSON en stdout** (`{"evt":"inscripcion",...}`), que captura el
  runtime del host. Sin datos personales. Sirve para alertar.
- **Una fila en `inscripcion_intentos`**, consultable con SQL. Guarda además lo
  que la persona escribió *cuando esos datos no quedaron guardados* — o sea, la
  copia de seguridad del votante que se perdió.

Resultados posibles: `ok`, `validacion`, `rate_limit`, `honeypot`,
`link_invalido`, `error`. Un `ok` con `persona_nueva = false` también es un caso
a mirar: la cédula ya existía en la campaña, se reusó esa persona y los datos del
formulario se descartaron.

Cuando algo falla de verdad, la persona ve un **código corto** en pantalla y lo
puede dictar por WhatsApp; con ese código se encuentra su intento exacto. Las
consultas listas para correr están en
[`db/consultas-observabilidad.sql`](db/consultas-observabilidad.sql).

Errores que escapan de un render o de una action los recoge `onRequestError` en
[`instrumentation.ts`](instrumentation.ts); la página pública del evento tiene
además su propio error boundary con botón de reintentar, así una caída de la DB
deja una pantalla entendible en vez de romper la página.

## Próximos pasos sugeridos

- Convertir en PWA instalable (service worker + `next-pwa`); el manifest ya está en `public/`.
- Gestión de territorios y asignaciones desde la UI (hoy se administran en la base).
- Invitaciones por rol en lugar de auto-selección de rol en el onboarding.
- Interacciones (puerta a puerta, llamadas) y GOTV el día de la elección (tablas ya existen).
- Extender la misma traza al formulario "Quiero apoyar" (`lib/observabilidad.ts`
  ya contempla el origen `apoyo`).
- Mostrarle al organizador, en la pantalla del evento, los intentos fallidos para
  que pueda recuperarlos sin pasar por SQL.
