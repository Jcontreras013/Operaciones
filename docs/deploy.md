# Despliegue — Render + Supabase

Arquitectura del despliegue:

- **Supabase** → base de datos PostgreSQL gestionada.
- **Render** → backend (API NestJS, servicio web Docker) + frontend (consola React, sitio estático).

Todo está descrito en [`render.yaml`](../render.yaml) (Render Blueprint). Los pasos manuales
son crear las cuentas/proyectos y completar unas pocas variables secretas o dependientes de URL.

---

## 1. Base de datos en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com). Elige región y una contraseña de BD.
2. Ve a **Project Settings → Database → Connection string** y copia la **URI**.
   - Usa la conexión **directa** (host `db.<ref>.supabase.co`, puerto `5432`) o el
     **session pooler**. Evita el *transaction pooler* (PgBouncer, 6543): rompe los
     prepared statements que usa TypeORM.
   - La URI se ve así:
     `postgresql://postgres:TU_PASSWORD@db.xxxxxxxx.supabase.co:5432/postgres`
3. No hace falta crear tablas ni extensiones a mano: la migración inicial hace
   `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` y crea todo el esquema.

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
