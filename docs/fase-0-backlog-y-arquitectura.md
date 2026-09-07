# Fase 0 — Backlog detallado y especificación técnica

> Entregable 3 del proyecto **Operaciones**. Aterriza la **Fase 0 del MVP** definida en el
> [Análisis competitivo](./analisis-competitivo-3pl-enterprise-latam.md): *"el sistema
> operativo del 3PL"*. **Agnóstico del país** (por decisión del equipo) — las reglas
> específicas por país (aduanas, impuestos, formatos de factura) se aíslan en configuración.

**Fecha:** Septiembre 2026 · **Estado:** Backlog + arquitectura Fase 0 (v1)

---

## 1. Objetivo de la Fase 0

Construir el **núcleo que ningún competidor del Grupo B/C tiene**: el registro único de
operación y el motor de facturación multi-cliente, con un portal y visibilidad que hagan
visible el valor desde el día 1.

**Definición de éxito (0–6 meses):**
- Un operador 3PL puede dar de alta clientes, registrar operaciones y **facturar
  automáticamente** por cliente según su rate card, sin doble captura.
- El cliente final ve el estado de sus operaciones y sus facturas en un portal.
- Todo lo que hace la UI existe también como **API pública**.

**Fuera de alcance en Fase 0** (van a Fase 1–2): WMS de piso, ruteo de última milla, app del
conductor, aduanas, financiamiento, IA de ejecución. En Fase 0 se dejan los *puntos de
extensión* (eventos y contratos de API) para que esas capas se enchufen después.

---

## 2. Épicas y historias de usuario

Prioridad: **P0** = imprescindible para el MVP · **P1** = deseable en Fase 0 si hay tiempo.

### E1 · Multi-tenancy y administración (P0)
Base sobre la que todo lo demás se apoya: aislamiento por operador y por cliente.
- **US1.1** (P0) Como operador, quiero registrar mi organización y mis usuarios con roles
  (admin, operaciones, finanzas, solo-lectura) para controlar el acceso.
- **US1.2** (P0) Como admin, quiero dar de alta **clientes** (los dueños de la carga) con sus
  datos y contactos, para operar en su nombre.
- **US1.3** (P0) Como sistema, quiero **aislar los datos por tenant** (operador) y segmentar
  por cliente, de modo que ningún dato cruce de un operador a otro.
- **US1.4** (P1) Como admin, quiero invitar a usuarios de mi **cliente** al portal con permisos
  de solo-lectura sobre *sus* operaciones.

### E2 · Registro único de operación (P0)
El corazón: un objeto `Operación` que acumula todo el ciclo de vida sin re-captura.
- **US2.1** (P0) Como operador, quiero crear una **operación** asociada a un cliente, con
  origen, destino, tipo de servicio y referencia, para empezar a trackearla.
- **US2.2** (P0) Como operador, quiero registrar **hitos/estados** (creada, en tránsito,
  en almacén, entregada, cerrada) que quedan con timestamp y autor.
- **US2.3** (P0) Como operador, quiero adjuntar **documentos** (BL, factura comercial,
  POD, etc.) a la operación, para tener trazabilidad.
- **US2.4** (P0) Como sistema, quiero que cada cambio de estado **emita un evento** en el bus,
  para alimentar visibilidad y facturación sin re-captura.
- **US2.5** (P1) Como operador, quiero registrar **costos** contra la operación (flete, handling,
  almacenaje) para calcular margen y facturar.

### E3 · Motor de facturación multi-cliente (P0) — *el arma diferencial*
- **US3.1** (P0) Como finanzas, quiero definir **rate cards por cliente**: tarifas por servicio,
  por actividad (almacenaje/día, handling, pick&pack, VAS) y por tramo.
- **US3.2** (P0) Como sistema, quiero **calcular cargos automáticamente** a partir de los eventos
  de la operación y la rate card del cliente (billing por actividad).
- **US3.3** (P0) Como finanzas, quiero **generar facturas** por cliente y período, revisarlas y
  aprobarlas antes de emitirlas.
- **US3.4** (P1) Como finanzas, quiero **conciliar facturas de carrier** contra los costos de la
  operación y el margen del cliente antes de facturar (*arma clave enterprise*).
- **US3.5** (P1) Como sistema, quiero **exportar la factura al ERP** del operador vía conector/API.

### E4 · Portal de cliente (P0)
- **US4.1** (P0) Como cliente, quiero ver el **estado en tiempo real** de mis operaciones.
- **US4.2** (P0) Como cliente, quiero **descargar mis documentos y facturas**.
- **US4.3** (P1) Como cliente, quiero **filtrar y buscar** por referencia, fecha o estado.

### E5 · Torre de visibilidad (P0)
- **US5.1** (P0) Como operador, quiero un **tablero** con todas las operaciones y su estado.
- **US5.2** (P0) Como operador, quiero **alertas de excepción** (operación demorada, sin
  actualización en X horas, documento faltante) para actuar a tiempo.
- **US5.3** (P1) Como operador, quiero **KPIs por cliente** (operaciones activas, on-time, margen).

### E6 · Plataforma de integración (P0)
- **US6.1** (P0) Como desarrollador integrador, quiero una **API pública REST** documentada
  para crear/consultar operaciones, clientes y facturas.
- **US6.2** (P0) Como sistema, quiero un **bus de eventos** interno del que cuelguen visibilidad,
  facturación e (futuro) IA, sin acoplar dominios.
- **US6.3** (P1) Como operador, quiero **webhooks** para notificar a sistemas externos ante
  cambios de estado.

---

## 3. Modelo de datos (multi-tenant)

Multi-tenancy **en el modelo desde el día 1**, no como parche. Todo cuelga de `tenant_id`
(el operador 3PL); las operaciones y facturas se segmentan además por `client_id`.

```
Tenant (operador 3PL)
 ├─ User            (rol: admin | ops | finance | readonly)
 ├─ Client          (dueño de la carga)
 │   └─ ClientUser  (acceso de solo-lectura al portal)
 ├─ RateCard        (por Client: reglas de tarifa por servicio/actividad)
 │   └─ RateRule    (base, unidad, condiciones)
 ├─ Operation       (registro único)  ── client_id
 │   ├─ Milestone   (estado + timestamp + autor)
 │   ├─ Document    (tipo, archivo, metadatos)
 │   ├─ CostItem    (costo real: flete, handling, almacenaje…)
 │   └─ ChargeItem  (cargo calculado desde RateCard + eventos)
 ├─ Invoice         (por Client + período)  ── estado: draft|approved|issued
 │   └─ InvoiceLine (← ChargeItems)
 └─ Event           (log inmutable del bus: entity, type, payload, ts)
```

**Reglas de aislamiento:**
- Toda consulta lleva `tenant_id` obligatorio (row-level security o filtro forzado en el ORM).
- El portal de cliente resuelve `client_id` desde el `ClientUser` autenticado — nunca acepta
  `client_id` del request.

---

## 4. Diseño del motor de facturación

El diferenciador. Flujo *event-driven*:

```
Operación cambia de estado ─▶ Evento ─▶ Motor de billing
                                          │
                    lee RateCard del Client + reglas por actividad
                                          │
                                  crea ChargeItem(s)
                                          │
     (al cierre de período) ─▶ agrupa ChargeItems ─▶ Invoice (draft)
                                          │
              finanzas revisa/concilia carrier ─▶ approve ─▶ issue ─▶ ERP
```

**Tipos de cargo soportados en Fase 0:**
| Tipo | Disparador | Unidad ejemplo |
|------|-----------|----------------|
| Por servicio | operación creada / servicio contratado | monto fijo |
| Almacenaje | días entre `en_almacen` y `salida` | tarifa × día × unidad |
| Handling | evento de recepción/despacho | tarifa × movimiento |
| Pick & pack | evento de preparación | tarifa × ítem/orden |
| Valor agregado (VAS) | evento manual del operador | tarifa × unidad |

**Principio:** el cargo se **deriva de eventos**, nunca se recaptura. Esto es lo que los ERP
genéricos no hacen sin desarrollo a medida.

---

## 5. Superficie de API (Fase 0)

REST, versionada (`/v1`), autenticación por API key/OAuth, todo con scope de tenant.

```
POST   /v1/clients                 crear cliente
GET    /v1/clients/{id}
POST   /v1/rate-cards              definir rate card de un cliente
POST   /v1/operations             crear operación
GET    /v1/operations/{id}
POST   /v1/operations/{id}/milestones   registrar hito (dispara evento)
POST   /v1/operations/{id}/documents    adjuntar documento
POST   /v1/operations/{id}/costs        registrar costo real
GET    /v1/invoices?client_id=&period=  listar/consultar facturas
POST   /v1/invoices/{id}/approve        aprobar factura
POST   /v1/webhooks                 registrar webhook (P1)
```

**Regla enterprise:** todo lo que hace la consola de operaciones se puede hacer por API.
El portal de cliente consume un subconjunto de solo-lectura.

---

## 6. Stack tecnológico recomendado

Elegido por las tres cualidades objetivo (cloud-native, API-first, listo para IA) y por
velocidad de entrega del MVP. Son recomendaciones, no obligaciones.

| Capa | Recomendación | Por qué |
|------|--------------|---------|
| Backend | **Node/TypeScript** (NestJS) o **Python** (FastAPI) | Ecosistema, tipado, buen soporte para APIs y colas |
| Base de datos | **PostgreSQL** (con row-level security) | Multi-tenancy robusto, JSONB para flexibilidad de eventos |
| Bus de eventos | **PostgreSQL + outbox** al inicio → **Kafka/NATS** al escalar | Empezar simple, migrar cuando el volumen lo exija |
| Frontend | **React/TypeScript** | Consola de ops + portal de cliente comparten componentes |
| Infra | **Cloud-native** (contenedores + gestionado) | Implementación en semanas, escalado horizontal |
| Auth | OAuth2 / OIDC + roles | Requisito enterprise (SSO más adelante) |

**Decisión de arquitectura:** empezar **modular monolith** (dominios separados por módulos,
un solo despliegue) y extraer microservicios solo cuando un dominio lo justifique. Evita la
complejidad prematura sin sacrificar la separación de dominios.

---

## 7. Secuencia de entrega sugerida (0–6 meses)

Cada bloque deja algo demostrable.

| Sprint(s) | Foco | Entregable demostrable |
|-----------|------|------------------------|
| 1–2 | E1 Multi-tenancy + E6 base (API + eventos) | Alta de operador, usuarios, clientes vía API/UI |
| 3–4 | E2 Registro único de operación | Crear operación, hitos, documentos; eventos fluyendo |
| 5–7 | E3 Motor de facturación | Rate cards + cálculo automático + factura draft |
| 8–9 | E5 Torre de visibilidad | Tablero + alertas de excepción |
| 10–11 | E4 Portal de cliente | Cliente ve estado, documentos y facturas |
| 12 | Endurecimiento + conector ERP (US3.5) | Demo end-to-end: operación → factura → ERP |

---

## 8. Riesgos de la Fase 0 y mitigación

| Riesgo | Mitigación |
|--------|-----------|
| Multi-tenancy mal hecho es caro de arreglar después | Row-level security y `tenant_id` obligatorio desde el sprint 1; pruebas de aislamiento |
| El motor de billing se vuelve un monstruo de reglas | Empezar con los 5 tipos de cargo del §4; reglas declarativas en datos, no en código |
| Doble captura se cuela por atajos | Regla dura: todo cargo se deriva de un evento; revisión de diseño en cada PR |
| Alcance de Fase 0 se estira hacia WMS/última milla | Congelar el alcance §1; esas capas son Fase 1 con puntos de extensión ya listos |

---

## 9. Decisiones abiertas para el equipo

1. **Stack definitivo** (Node vs. Python) — según el equipo de desarrollo disponible.
2. **País de entrada** (pendiente) — cuando se defina, se cargan sus reglas de impuestos/factura
   como *configuración*, sin tocar el núcleo.
3. **Modelo de negocio** (SaaS por volumen vs. take-rate) — afecta qué métricas instrumentar
   desde el MVP.

> **Siguiente entregable posible:** con el stack elegido, montar el **esqueleto del repositorio**
> (estructura de módulos, modelo de datos inicial, primer endpoint de la API) para arrancar el sprint 1.
