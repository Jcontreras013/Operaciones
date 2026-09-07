# Despliegue — Render + Supabase

Arquitectura del despliegue:

- **Supabase** → base de datos PostgreSQL gestionada.
- **Render** → backend (API NestJS, servicio web Docker) + frontend (consola React, sitio estático).

Todo está descrito en [`render.yaml`](../render.yaml) (Render Blueprint). Los pasos manuales
son crear las cuentas/proyectos y completar unas pocas variables secretas o dependientes de URL.

---

## 1. Base de datos (PostgreSQL)

La app necesita un PostgreSQL estándar (conexión por `DATABASE_URL`). **Appwrite no sirve**
(es un BaaS con API propia, no expone Postgres). Dos caminos:

**Opción A — Postgres de Render (por defecto en `render.yaml`).** El Blueprint incluye un
bloque `databases` que crea `operaciones-db` y cablea `DATABASE_URL` al backend
automáticamente. No hay que copiar nada. Plan free: 1 GB (se borra a los ~30 días de inactividad).

**Opción B — Postgres externo (Neon, Supabase, etc.).** Borra el bloque `databases` de
`render.yaml` y define `DATABASE_URL` como `sync: false` en `operaciones-api`; pega la URI del
proveedor en el panel. En Neon: crea el proyecto, copia la connection string (incluye
`?sslmode=require`). En Supabase: usa la conexión **directa** `:5432`, no el pooler 6543.

En cualquier caso, no hay que crear tablas ni extensiones a mano: la migración inicial hace
`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` y crea todo el esquema al arrancar el backend.

---

## 2. Servicios en Render

1. En [render.com](https://render.com): **New → Blueprint** y apunta a este repositorio
   (rama a desplegar). Render lee `render.yaml` y propone dos servicios:
   `operaciones-api` (Docker) y `operaciones-web` (estático).
2. Aplica el Blueprint. El primer build puede fallar hasta completar las variables abajo —
   es esperable.

### Variables del backend (`operaciones-api`)

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | la URI de Supabase del paso 1 (secreta) |
| `DATABASE_SSL` | `true` (ya en el Blueprint) |
| `DATABASE_SYNCHRONIZE` | `false` (ya en el Blueprint) |
| `DATABASE_MIGRATIONS_RUN` | `true` (ya en el Blueprint) — corre migraciones al arrancar |
| `JWT_SECRET` | lo genera Render automáticamente |
| `CORS_ORIGIN` | la URL del frontend (se completa en el paso 3) |

### Variables del frontend (`operaciones-web`)

| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | la URL pública del backend, p. ej. `https://operaciones-api.onrender.com` |

---

## 3. Enlazar las URLs (segundo pase)

Como cada servicio necesita la URL del otro, tras el primer deploy:

1. Copia la URL del backend (`https://operaciones-api.onrender.com`) → pégala en
   `VITE_API_URL` del frontend y **redepliega el frontend** (Vite inyecta la URL en el build).
2. Copia la URL del frontend (`https://operaciones-web.onrender.com`) → pégala en
   `CORS_ORIGIN` del backend y **redepliega el backend**.

---

## 4. Migraciones

El backend corre las migraciones pendientes **al arrancar** cuando
`DATABASE_MIGRATIONS_RUN=true` (configurado en el Blueprint). No hay paso manual.

Para correrlas a mano (local o CI) contra una base:

```bash
export DATABASE_URL=postgresql://...   # y DATABASE_SSL=true si aplica
npm run build
npm run migration:run
```

Generar una nueva migración tras cambiar entidades:

```bash
npm run migration:generate --name=DescripcionDelCambio
```

---

## 5. Primer arranque (bootstrap)

Con el backend vivo, crea el primer operador (ruta pública):

```bash
curl -X POST https://operaciones-api.onrender.com/v1/tenants \
  -H 'Content-Type: application/json' \
  -d '{"name":"Mi Operador","slug":"mioperador","adminEmail":"admin@mioperador.com","adminPassword":"una-clave-fuerte"}'
```

Luego entra al frontend (`https://operaciones-web.onrender.com`) con
`slug` + email + contraseña. La documentación de la API queda en
`https://operaciones-api.onrender.com/docs`.

---

## Notas

- **Plan free de Render:** el backend se "duerme" tras inactividad; el primer request tras
  dormir tarda unos segundos. Suficiente para demo/staging.
- **Secretos:** nunca commitear `DATABASE_URL` ni `JWT_SECRET`; viven solo en el panel de Render.
- **Rotar `JWT_SECRET`** invalida las sesiones existentes (obliga a re-login).
