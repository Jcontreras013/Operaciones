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

### Implementado en este incremento

- **Multi-tenancy** (E1): aislamiento por `tenant_id` en toda entidad; el tenant se resuelve
  por request vía header `x-tenant-id` (se reemplazará por el token de auth en E1 completo).
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
- **Torre de visibilidad** (E5): lado de lectura sobre el registro único y la facturación —
  tablero con conteo por estado, alertas de excepción (`stale`: operación abierta sin actividad;
  `missing_pod`: entrega sin prueba de entrega) y KPIs por cliente (activas, entregadas,
  ingresos, costos y margen).
- **Portal de cliente** (E4): superficie de solo-lectura con **autenticación propia**. El
  usuario de cliente se identifica con `x-client-user-id`; el `tenantId` y el `clientId` se
  **derivan** de ese usuario (nunca del request), garantizando que cada cliente vea solo lo suyo.
  Expone sus operaciones, línea de tiempo, documentos y facturas, con filtros por estado y
  referencia (US4.1–US4.3). También completa el alta de usuarios de cliente (US1.4).

### Pendiente (próximos sprints de Fase 0)

Export de facturas a ERP (US3.5); API pública documentada (Swagger/OpenAPI) y auth
OAuth2/OIDC real (E6, hoy los headers `x-tenant-id`/`x-client-user-id` son el stub de sesión).
