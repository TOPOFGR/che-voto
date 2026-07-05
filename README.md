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

## Próximos pasos sugeridos

- Convertir en PWA instalable (service worker + `next-pwa`); el manifest ya está en `public/`.
- Gestión de territorios y asignaciones desde la UI (hoy se administran en la base).
- Invitaciones por rol en lugar de auto-selección de rol en el onboarding.
- Interacciones (puerta a puerta, llamadas) y GOTV el día de la elección (tablas ya existen).
