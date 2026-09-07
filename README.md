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
│  └─ events/        E6 · Bus de eventos (patrón outbox)
└─ health/           Health check
```

### Cómo correr

```bash
npm install
cp .env.example .env            # ajustar credenciales de PostgreSQL
# levantar un PostgreSQL local y crear la base indicada en .env
npm run start:dev               # API en http://localhost:3000
```

Verificación sin base de datos:

```bash
npm run build       # compila
npm run typecheck   # chequeo estricto de tipos
npm test            # pruebas unitarias
```

Ejemplos de uso de la API en [`requests.http`](./requests.http).

### Implementado en este incremento

- **Multi-tenancy** (E1): aislamiento por `tenant_id` en toda entidad; el tenant se resuelve
  por request vía header `x-tenant-id` (se reemplazará por el token de auth en E1 completo).
- **Alta de operador y usuarios** con roles (admin/ops/finance/readonly).
- **Clientes** del operador.
- **Registro único de operación** (E2): crear operación, registrar hitos con avance de estado,
  adjuntar documentos y registrar costos.
- **Bus de eventos** (E6): cada cambio persiste un evento en el outbox y se despacha en memoria,
  listo para que facturación y visibilidad se suscriban sin acoplar dominios.

### Pendiente (próximos sprints de Fase 0)

Motor de facturación multi-cliente (E3), portal de cliente (E4), torre de visibilidad (E5),
API pública documentada y auth OAuth2/OIDC (E6), conector ERP.
