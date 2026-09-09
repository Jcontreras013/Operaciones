# Despliegue — Render

Arquitectura del despliegue:

- **PostgreSQL de Render** — base ya creada a mano en el dashboard (`operaciones-db`), fuera del
  Blueprint (así el Blueprint no intenta crear otra con el mismo nombre).
- **Render** → backend (API NestJS, servicio web Docker) + frontend (consola React, sitio estático),
  descritos en [`render.yaml`](../render.yaml) (Render Blueprint).

Los pasos manuales son: crear la base (ya hecho), aplicar el Blueprint, y completar unas pocas
variables secretas o dependientes de URL.

---

## 1. Base de datos (ya creada)

Si ya tienes `operaciones-db` en el dashboard de Render (New → PostgreSQL), anota estos dos datos
de su pestaña **Info** → **Connections**:

- **Region** (p. ej. Oregon) — `operaciones-api` debe crearse en la misma región.
- **Internal Database URL** — úsala para `DATABASE_URL`, no la External: es más rápida (red
  privada de Render, sin salir a internet) y no tiene costo de transferencia. La External sirve
  para conectarte desde tu máquina (`psql`, un cliente de DB) durante troubleshooting.

No hay que crear tablas ni extensiones a mano: la migración inicial hace
`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` y crea todo el esquema al arrancar el backend.

¿Todavía no la creaste? **New → PostgreSQL** en Render, nómbrala `operaciones-db`, plan free (1 GB),
la región que prefieras — solo asegúrate de crear `operaciones-api` en esa misma región después.

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
| `DATABASE_URL` | **Internal Database URL** de `operaciones-db` (paso 1) |
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

Para correrlas a mano (local o CI) contra una base — usa la **External Database URL** si corres
esto fuera de Render (tu máquina no tiene acceso a la red privada interna):

```bash
export DATABASE_URL=postgresql://...   # External Database URL + DATABASE_SSL=true
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
- **Región:** `operaciones-api` y `operaciones-db` deben estar en la misma región — si no, la
  Internal Database URL no resuelve y el backend no arranca (falla el healthcheck).
- **Secretos:** nunca commitear `DATABASE_URL` ni `JWT_SECRET`; viven solo en el panel de Render.
- **Rotar `JWT_SECRET`** invalida las sesiones existentes (obliga a re-login).
- **Networking de la base:** por defecto Render permite conexiones entrantes desde cualquier IP
  (`0.0.0.0/0`) a la External Database URL. Para producción, restringe las IP Restrictions de
  `operaciones-db` a las que de verdad la usan (tu IP para troubleshooting; los servicios internos
  de Render no la necesitan, usan la red privada).
