# Operaciones

Proyecto de plataforma logística. Cuadrante objetivo: **operación 3PL integral · segmento
enterprise · mercado LATAM**.

## Documentación

Los estudios y especificaciones viven en [`docs/`](./docs):

1. **[Estudio de mercado](./docs/estudio-mercado-software-logistica.md)** — panorama del
   software de logística (2026): las 6 capas, líderes por categoría y "lo mejor de cada uno".
2. **[Análisis competitivo](./docs/analisis-competitivo-3pl-enterprise-latam.md)** — el
   cuadrante 3PL integral · enterprise · LATAM: grupos de competidores, matriz de brechas,
   backlog de MVP por fases y arquitectura de referencia.
3. **[Fase 0 — Backlog y arquitectura](./docs/fase-0-backlog-y-arquitectura.md)** — "el
   sistema operativo del 3PL": épicas, historias de usuario, modelo de datos multi-tenant,
   motor de facturación, API y stack.

## Código

Backend en **NestJS + TypeScript + PostgreSQL (TypeORM)**, como *modular monolith* con
multi-tenancy desde el día 1. Estado: Fase 0 en curso (sprints 1–4 del backlog).

### Estructura

```
src/
├─ common/
│  ├─ tenant/        Contexto multi-tenant (AsyncLocalStorage) + middleware
│  └─ database/      Config de TypeORM + entidad base
├─ modules/
│  ├─ tenancy/       E1 · Operadores y usuarios (alta de operador)
│  ├─ clients/       E1 · Clientes (dueños de la carga)
│  ├─ operations/    E2 · Registro único: operación, hitos, documentos, costos
│  ├─ billing/       E3 · Rate cards, motor de cargos y facturas
│  ├─ visibility/    E5 · Tablero, alertas de excepción y KPIs (read model)
│  ├─ portal/        E4 · Portal de cliente (auth propia, solo-lectura)
│  ├─ warehouse/     Fase 1 · WMS: almacenes, ubicaciones, inventario, movimientos
│  ├─ delivery/      Fase 1 · TMS/última milla: flota, rutas, optimización, POD
│  ├─ field/         Migración monitor · ingesta de órdenes telecom (Cepheus)
│  ├─ auth/          E6 · Autenticación JWT (login operador y portal)
│  └─ events/        E6 · Bus de eventos (patrón outbox)
└─ health/           Health check
```

### Cómo correr

Con Docker (recomendado):

```bash
docker compose up -d db         # solo PostgreSQL
npm install
npm run start:dev               # API en http://localhost:3000

# o todo en contenedores (base + API):
docker compose up --build
```

Sin Docker (PostgreSQL propio):

```bash
npm install
cp .env.example .env            # ajustar credenciales de PostgreSQL
# crear la base indicada en .env
npm run start:dev               # API en http://localhost:3000
```

> Verificado end-to-end: alta de operador → cliente → rate card → operación →
> hitos que disparan cargos automáticos (`per_service`, `handling`, `storage`
> por días) → factura `draft → approved → issued`. Ver [`requests.http`](./requests.http).

Verificación sin base de datos:

```bash
npm run build       # compila
npm run typecheck   # chequeo estricto de tipos
npm test            # pruebas unitarias
```

Ejemplos de uso de la API en [`requests.http`](./requests.http).

**Documentación interactiva (OpenAPI/Swagger):** con la API corriendo, en
`http://localhost:3000/docs` (y el JSON en `/docs-json`). Agrupa las rutas por área y
documenta los dos esquemas de autenticación de la Fase 0: `x-tenant-id` (operador) y
`x-client-user-id` (portal). Usa el botón **Authorize** para fijar los headers y probar.

## Front end — consola del operador (`web/`)

SPA en **React + TypeScript + Vite**, con React Query para los datos y un sistema de estilos
propio en CSS (misma identidad visual que los estudios). Autenticación por JWT contra la API.

```bash
cd web
npm install
cp .env.example .env
npm run dev        # http://localhost:5173 (proxya /api al backend en :3000)
```

Requiere el backend corriendo. Incluye: **login** (guarda el token, redirige a login al expirar),
**tablero** (métricas por estado + excepciones + operaciones recientes), **clientes**
(listar/crear) y **operaciones** (listar/crear + detalle con línea de tiempo y registro de hitos).
Verificado end-to-end contra la API real (login → datos en vivo). Próximas vistas: facturación,
inventario (WMS) y rutas (última milla); portal de cliente y app del conductor como SPAs aparte.

## Implementado en este incremento (backend)

- **Autenticación JWT** (E6): login con contraseña (bcrypt) en `POST /v1/auth/login` (operador)
  y `POST /portal/auth/login` (cliente); devuelve un access token Bearer. El `tenantId` y el
  `clientId` se **derivan de los claims del token**, no de headers. Los tokens llevan `typ`
  (`operator`/`portal`), de modo que un token de operador no sirve en el portal ni viceversa.
  Los claims son estándar (`sub`, `tenantId`, …) para poder enchufar un IdP OIDC externo después.
- **Multi-tenancy** (E1): aislamiento por `tenant_id` en toda entidad; el tenant llega en el
  token validado por el middleware (antes era un header stub).
- **Alta de operador y usuarios** con roles (admin/ops/finance/readonly).
- **Clientes** del operador.
- **Registro único de operación** (E2): crear operación, registrar hitos con avance de estado,
  adjuntar documentos y registrar costos.
- **Bus de eventos** (E6): cada cambio persiste un evento en el outbox (dentro de la transacción)
  y se despacha en memoria tras el commit, sin acoplar dominios.
- **Motor de facturación multi-cliente** (E3): rate cards por cliente con reglas por actividad;
  los cargos se **derivan de los eventos** de la operación, nunca por re-captura —
  `per_service` al crear, `handling` al llegar a un estado, y `storage` calculado por días al
  entregar. Generación de facturas draft → aprobar → emitir, con montos en enteros (sin floats).
  Incluye **conciliación de facturas de carrier** (US3.4): registrar la factura del proveedor
  y conciliarla contra los costos registrados (`reconciled`/`disputed` según variación y
  tolerancia), más el **margen por operación** (ingresos − costos) para verificar antes de facturar.
  Y **export a ERP** (US3.5): un conector enchufable (puerto/adaptador) exporta la factura
  emitida y registra el intento (idempotente); la Fase 0 trae un `StubErpConnector` que se
  sustituye por un adaptador real sin tocar el servicio de facturación.
- **Torre de visibilidad** (E5): lado de lectura sobre el registro único y la facturación —
  tablero con conteo por estado, alertas de excepción (`stale`: operación abierta sin actividad;
  `missing_pod`: entrega sin prueba de entrega) y KPIs por cliente (activas, entregadas,
  ingresos, costos y margen).
- **Portal de cliente** (E4): superficie de solo-lectura con **autenticación propia**. El
  usuario de cliente se identifica con `x-client-user-id`; el `tenantId` y el `clientId` se
  **derivan** de ese usuario (nunca del request), garantizando que cada cliente vea solo lo suyo.
  Expone sus operaciones, línea de tiempo, documentos y facturas, con filtros por estado y
  referencia (US4.1–US4.3). También completa el alta de usuarios de cliente (US1.4).

### Fase 1 (en curso)

- **WMS multi-tenant** (módulo `warehouse`): almacenes y ubicaciones (bins); **inventario en
  tiempo real segmentado por cliente** (cada cliente ve solo lo suyo aunque comparta almacén);
  movimientos atómicos de **recepción, transferencia/putaway y pick** con validación de
  existencia y log de auditoría; consultas de inventario por ubicación y resumen agregado por
  cliente+SKU. Cada movimiento emite un evento (`warehouse.*`) al outbox.
- **TMS / última milla** (módulo `delivery`): **flota propia** (vehículos) y **carriers 3PL**;
  entregas en un pool que se asignan a **rutas** (asignadas a flota propia **o** a un carrier —
  orquestación); **optimización de rutas enchufable** (puerto/adaptador, con un optimizador
  nearest-neighbor en la Fase 1 y SimpliRoute/Locus enchufables después); despacho de la ruta y
  **prueba de entrega (POD)** por parada (recibido por, foto, nota) o marca de fallo. Emite
  eventos `delivery.*` / `route.dispatched` al outbox y cierra la ruta al no quedar paradas activas.
- **Facturación por actividad end-to-end** (cierra el ciclo operación→cobro): el motor de cargos
  también reacciona a los eventos de la operación física — `warehouse.receipt` → HANDLING,
  `warehouse.pick` → PICK_PACK, `delivery.delivered` → LAST_MILE — creando el cargo desde la
  regla correspondiente de la rate card (las reglas *de actividad* son las que no tienen
  `triggerStatus`). Los cargos de actividad pueden no estar atados a una operación y guardan su
  `source`. Verificado: recepción×20 → 2000, pick×5 → 250, entrega → 4000, todo automático.

## Migración del Monitor Operativo (unificación)

Plan en [`docs/migracion-monitor-operativo.md`](./docs/migracion-monitor-operativo.md).

- **Fase A — Ingesta** (módulo `field`): órdenes telecom desde la API **Cepheus** a PostgreSQL,
  con un **conector enchufable** — `HttpCepheusConnector` (HTTP Basic Auth, rota entre varias
  cuentas de consulta, respeta el límite de 5 consultas/hora de Cepheus) si `CEPHEUS_BASE_URL`
  está configurada, si no el stub con órdenes de ejemplo. Ver variables `CEPHEUS_*` en
  [`.env.example`](./.env.example) — nunca en el repo, y nunca reutilizar credenciales que hayan
  estado expuestas en `monitor-operativo` (repo público: rotarlas en Cepheus/IT primero). Upsert
  idempotente por `NUM`, registro de corridas (`ingest_runs`, con estado `rate_limited` aparte de
  `error`). Reemplaza al `sync_job.py` del monitor.
- **Fase B — Monitor diario** (React, ruta `/monitor`): tablero con totales por estado/actividad/
  técnico, filtros y sincronización manual (`GET /v1/field/board`).
- **Fase C — Offline y mapa OLT/PON** (React, ruta `/red`): detección de equipos de red caídos
  (`ES_OFFLINE`) y demoras SOP sin liquidar (`ALERTA_TIEMPO`) sobre soportes de fibra abiertos;
  diagnóstico de causa raíz clasificando el cierre del técnico (incluye falsos positivos) sobre
  los ya cerrados; mapa de concentración de fallas por OLT y por PON. Portado 1:1 de la lógica de
  `tools.py` (`calcular_offline_y_alertas`, `clasificar_causa_offline`) — ver `src/modules/field/
  offline.ts` (`GET /v1/field/offline`, con `?days=` para la ventana del diagnóstico).
- **Fase D — Calidad** (módulo `quality`, React ruta `/calidad`): encuesta de control
  post-servicio (reemplaza la pestaña "Registrar Gestión de Llamada" de `ccalidad.py` — sin envío
  por WhatsApp/WATI, es un servicio de paga que no se está usando). 6 resultados de contacto
  posibles + la encuesta de 7 preguntas (escala 1-5) cuando sí contestan; P4 (TV Cable/CCVEO)
  admite "No aplica". Indicador oficial: **CSAT = % de respuestas con P7 en {4,5}** sobre el total
  de llamadas contestadas; P1-P6 son diagnóstico (promedio por pregunta, para saber exactamente
  qué mejorar). "Requiere seguimiento" es independiente del resultado de la llamada — ticket,
  responsable y fecha límite, con listado de pendientes y endpoint para resolverlos.
  `GET /v1/quality/report?days=` para el reporte completo.

### Roles y control de acceso (Monitor/Red/Calidad)

`UserRole` (`src/modules/tenancy/entities/user.entity.ts`) agrega **JEFE**, **MONITOREO** y
**LLAMADOS** a los cuatro genéricos del 3PL (admin/ops/finance/readonly), reflejando el modelo de
roles que ya conocía el equipo en el monitor original. A diferencia de los genéricos (hoy solo
metadata, ningún guard los exige), estos tres sí se validan de verdad con `RolesGuard`
(`@common/auth/roles.guard` + `@Roles(...)`), aplicado en `FieldController` y `QualityController`:

| Ruta | Admin | Jefe | Monitoreo | Llamados |
|---|---|---|---|---|
| `POST /v1/field/ingest` (forzar sincronización) | ✅ | — | — | — |
| `GET /v1/field/board` (Monitor) | ✅ | ✅ | ✅ | — |
| `GET /v1/field/work-orders*` (incluye buscador de Calidad) | ✅ | ✅ | ✅ | ✅ |
| `GET /v1/field/offline`, `/ingest-runs` (Red / histórico) | ✅ | ✅ | — | — |
| `/v1/quality/*` (Calidad completa) | ✅ | ✅ | ✅ | ✅ |

Sin `@Roles(...)` en una ruta, `RolesGuard` no restringe nada — no hay superusuario implícito: si
ADMIN debe entrar a una ruta, se lista explícitamente igual que los demás.

Próximo: biometría, expedientes y vehículos (Fase E).

## Despliegue

Preparado para **Render** (backend + frontend) + **Supabase** (PostgreSQL) vía
[`render.yaml`](./render.yaml). Paso a paso en [`docs/deploy.md`](./docs/deploy.md).

Producción usa **migraciones** de TypeORM (no `synchronize`): soporta `DATABASE_URL` con
`DATABASE_SSL=true`, y aplica las migraciones al arrancar con `DATABASE_MIGRATIONS_RUN=true`.
CORS se restringe con `CORS_ORIGIN`. La migración inicial (`src/migrations`) crea las 25 tablas
y la extensión `uuid-ossp`.

```bash
npm run migration:run                      # aplica pendientes contra DATABASE_URL
npm run migration:generate --name=Cambio   # genera una nueva tras editar entidades
```

### Estado

**Fase 0 completa** (E1–E6). **Fase 1 en curso**: WMS, TMS/última milla y facturación por
actividad entregados y verificados end-to-end; primera consola web funcional. **Deploy** listo
(Render + Supabase, con migraciones). Pendiente de Fase 1: app del conductor (los endpoints de
POD ya existen; falta la interfaz) y picking optimizado (olas/zonas). Mejoras diferibles:
federación OIDC con IdP externo (los claims ya son compatibles) y refresh tokens.
