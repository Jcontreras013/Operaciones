# Análisis Competitivo — Plataforma 3PL Integral · Enterprise · LATAM

> Entregable 2 del proyecto **Operaciones**. Parte del [Estudio de mercado](./estudio-mercado-software-logistica.md)
> y profundiza en el cuadrante elegido: **operación 3PL integral, segmento enterprise, mercado LATAM**.

**Fecha:** Septiembre 2026 · **Estado:** Análisis competitivo + backlog MVP (v1)

---

## 1. La tesis en una frase

> **Nadie sirve bien las tres variables a la vez.** Los líderes globales tienen la
> profundidad 3PL pero no son LATAM-native ni modernos; los digitales de LATAM son
> modernos y regionales pero **no son plataformas 3PL** que un operador enterprise pueda
> operar. Ese cruce vacío es la oportunidad de Operaciones.

El mercado de digital freight forwarding va a **US$22.9 mil millones para 2030 (CAGR 23.1%)**
y el e-commerce en LATAM supera los **US$200 mil millones en 2026** — la demanda existe y crece.

---

## 2. Los tres grupos de competidores

Para el cuadrante "3PL integral · enterprise · LATAM" compiten tres tipos de jugador, y
cada uno cubre solo una parte del problema.

### Grupo A — Suites 3PL globales (profundidad, sin contexto LATAM)
| Plataforma | Qué es | Fortaleza | Debilidad para este cuadrante |
|-----------|--------|-----------|-------------------------------|
| **CargoWise** (WiseTech) | Suite enterprise de forwarding | Domina el tier enterprise; multimodal + aduanas end-to-end | Implementación de 6+ meses con consultores; curva de aprendizaje empinada; precio alto (+20–50% con "Value Packs" desde dic-2025); UX difícil; no LATAM-native |
| **Magaya** (Miami) | Suite mid-market de las Américas | Forwarding + WMS + contabilidad por embarque; fuerte presencia en LATAM | UI anticuada (razón #1 de abandono); re-captura manual cotización→embarque (43%); brechas de integración contable; pensado para SMB/mid, no enterprise |
| **Manhattan / Blue Yonder / Infor** | WMS/TMS enterprise | Máxima profundidad por capa a escala | Costo y complejidad enterprise; no integran forwarding+aduanas LATAM; no LATAM-native |

### Grupo B — Digitales de LATAM (regional y moderno, pero no es plataforma 3PL)
| Plataforma | Qué es | Fortaleza | Debilidad para este cuadrante |
|-----------|--------|-----------|-------------------------------|
| **Nowports** | Digital freight forwarder ($150M Serie C) | LATAM-native; UX moderna; cotización + tracking + documentos + seguro + **financiamiento logístico** | **Es un forwarder que opera, no un software que tú operas** — no es plataforma 3PL multi-cliente para que un operador corra su propio negocio |
| **KLog.co** | Forwarder digital chileno | Transporte internacional LATAM | Mismo límite: operador, no plataforma; alcance por capa acotado |
| **Nuevaflo / Linbis** | Software para forwarders LATAM | Alternativas modernas a CargoWise/Magaya | Enfoque forwarding; sin operación 3PL integral (WMS multi-cliente + última milla + flota) |

### Grupo C — Especialistas LATAM de una capa (excelentes pero de un solo eje)
| Plataforma | Capa | Fortaleza | Debilidad para este cuadrante |
|-----------|------|-----------|-------------------------------|
| **SimpliRoute / Drivin / QuadMinds** | Última milla / ruteo | IA de ruteo al contexto LATAM; hasta −30% costo operativo; flotas mixtas | Monocapa: no cubren forwarding, WMS multi-cliente, aduanas ni facturación 3PL |
| **SyncTMS / Tookane / NovaTrans** | TMS regional | Centralizan viajes, costos y documentación | Monocapa TMS; no es operación 3PL integral |

---

## 3. Matriz de brechas — dónde está el hueco

Cobertura por capa de cada grupo (● fuerte · ◐ parcial · ○ ausente/débil):

| Capa / capacidad | Grupo A (globales) | Grupo B (digitales LATAM) | Grupo C (especialistas) | **Oportunidad Operaciones** |
|------------------|:---:|:---:|:---:|:---:|
| Forwarding + aduanas | ● | ● | ○ | Igualar |
| WMS multi-cliente | ● | ○ | ○ | **Ganar** |
| TMS / planeación | ● | ◐ | ● | Igualar |
| Última milla LATAM | ○ | ◐ | ● | **Ganar** |
| Flota / telemática | ◐ | ○ | ◐ | Igualar |
| Visibilidad + IA excepciones | ● | ◐ | ○ | Igualar |
| **Facturación multi-cliente 3PL** | ◐ | ○ | ○ | **Ganar** |
| LATAM-native (aduanas intra-región, direcciones imprecisas, flota mixta) | ○ | ● | ● | **Ganar** |
| UX moderna / cero doble captura | ○ | ● | ● | **Ganar** |
| Implementación rápida (semanas) | ○ | ● | ● | **Ganar** |

**Lectura:** ningún grupo tiene la columna completa. El hueco defendible de Operaciones es
ser **la única plataforma 3PL integral que es a la vez enterprise-grade y LATAM-native, con
UX moderna e implementación rápida** — con dos armas que casi nadie combina:

1. **Motor de facturación multi-cliente 3PL** — rate cards por cliente, billing por actividad
   (almacenaje, handling, pick&pack, servicios de valor agregado), y **conciliación de
   facturas de carrier contra el margen de cada cliente**. Los ERP genéricos no lo hacen sin
   desarrollo costoso; es el candado de retención enterprise.
2. **Registro único de operación** (lección de Magaya) — un dato se ingresa una vez y fluye
   por forwarding, WMS, TMS, última milla y contabilidad. Cero doble captura.

---

## 4. Requisitos no negociables del segmento enterprise 3PL

Para competir en enterprise (no PyME), el mercado exige:

- **Arquitectura multi-tenant real:** separar inventario, reglas y facturación por cliente —
  cientos de clientes en la misma instalación, con datos aislados pero vista unificada para operaciones.
- **Motor de billing por contrato:** rate cards específicas por cliente y billing por actividad;
  conciliar facturas de carrier contra el margen antes de emitir la factura al cliente.
- **Integración ERP/OMS/TMS + APIs abiertas:** generación de facturas y pagos integrada al ERP;
  conectores a carriers.
- **Portales de cliente + reportería** por cliente (SLA, KPIs).
- **SLAs, roles y auditoría** a nivel enterprise.

---

## 5. Backlog de MVP — no construir las 6 capas de golpe

**Principio de secuencia:** entrar por el **núcleo que crea el registro único y el candado de
retención** (operación + facturación multi-cliente), hacer visible el valor con visibilidad, y
recién después expandir a las capas operativas. La última milla —aunque es alto ROI— está
saturada en LATAM (SimpliRoute, Drivin, QuadMinds) y no retiene a un 3PL enterprise por sí sola;
por eso **se integra o se compra antes que construirse primero**.

### Fase 0 — MVP (0–6 meses): "El sistema operativo del 3PL"
El corazón que nadie del Grupo B/C tiene.
- **Registro único de operación** (una orden fluye por todo el sistema, cero doble captura).
- **Motor de facturación multi-cliente** (rate cards por cliente + billing por actividad + conciliación de carrier).
- **Portal de cliente** (estado, documentos, facturas).
- **Torre de visibilidad** (tracking + alertas de excepción) como valor visible desde el día 1.
- **Integración ERP** (conectores + API pública).

### Fase 1 — Operación física (6–12 meses)
- **WMS multi-tenant** (recepción, ubicación dirigida, picking optimizado, inventario en tiempo real por cliente).
- **TMS + última milla:** integrar/comprar ruteo (estilo SimpliRoute) en vez de construir desde cero; orquestar **flota propia + tercerizada** (lección de Locus/Bringg).
- **App del conductor + prueba de entrega** (lección de Onfleet).

### Fase 2 — Profundidad y diferenciación (12–24 meses)
- **Forwarding + aduanas intra-LATAM** (igualar a CargoWise/Nowports en lo que importa a la región).
- **Financiamiento logístico** (arma de Nowports; alto valor en LATAM).
- **IA de ejecución:** resolución automática de excepciones y ETAs predictivos (lección de project44/FourKites).
- **Telemática de flota** vía APIs abiertas (lección de Geotab).

---

## 6. Arquitectura de referencia

Diseñada desde el día 1 para las tres cualidades de los ganadores de 2026: **cloud-native,
API-first, IA en la ejecución**.

```
┌──────────────────────────────────────────────────────────────┐
│  CANALES        Portal cliente · App conductor · Consola ops   │
├──────────────────────────────────────────────────────────────┤
│  IA DE EJECUCIÓN   Ruteo · Excepciones · ETAs predictivos      │
├──────────────────────────────────────────────────────────────┤
│  DOMINIOS       Forwarding │ WMS │ TMS │ Última milla │ Flota   │
│  (microservicios) └──────── REGISTRO ÚNICO DE OPERACIÓN ──────┘│
├──────────────────────────────────────────────────────────────┤
│  FACTURACIÓN MULTI-CLIENTE   Rate cards · Billing actividad ·  │
│                              Conciliación de carrier           │
├──────────────────────────────────────────────────────────────┤
│  DATOS          Modelo multi-tenant (aislamiento por cliente)  │
├──────────────────────────────────────────────────────────────┤
│  INTEGRACIÓN    API pública · Conectores ERP/OMS · Carrier APIs│
│                 Bus de eventos (event-driven)                  │
└──────────────────────────────────────────────────────────────┘
```

**Principios:**
- **Multi-tenancy** en el modelo de datos, no como parche posterior.
- **Event-driven:** cada cambio en la operación emite un evento que alimenta visibilidad,
  facturación e IA sin re-captura.
- **API-first:** todo lo que hace la UI se puede hacer por API (requisito enterprise).
- **IA como capa transversal** que actúa (asigna, re-rutea, resuelve), no solo reporta.

---

## 7. Riesgos y decisiones abiertas

| Riesgo | Mitigación |
|--------|-----------|
| Alcance enorme (6 capas) | Secuencia por fases; Fase 0 entrega valor solo con el núcleo |
| Última milla saturada en LATAM | Integrar/comprar en vez de construir; no competir de frente ahí |
| Ciclo de venta enterprise largo | Portal + facturación multi-cliente como candado; land-and-expand |
| Aduanas por país (complejidad regulatoria) | Empezar por 1 país y expandir; Fase 2 |

**Decisiones abiertas para el equipo:**
1. **¿País de entrada?** Concentrar Fase 0/1 en un mercado (ej. México — 25–30% del funding
   regional; o Colombia/Chile) hace el MVP mucho más concreto. → *Recomiendo definirlo antes del backlog detallado.*
2. **¿Construir vs. integrar la última milla?** Recomendado integrar en Fase 1.
3. **¿Modelo de negocio?** SaaS por cliente/volumen vs. take-rate sobre operaciones (como los digitales).

---

## Fuentes

- GoFreight — Magaya Alternatives 2026: https://gofreight.com/blog/magaya-alternatives
- Magaya — Magaya vs. CargoWise: https://www.magaya.com/magaya-vs-cargowise-what-the-industry-is-actually-saying/
- NuevaFlo — CargoWise vs Magaya / Alternatives LATAM: https://www.nuevaflo.com/en/blog/cargowise-vs-magaya/ · https://www.nuevaflo.com/en/blog/best-freight-forwarding-software-alternatives-latin-america
- Nowports — Plataforma y posición LATAM: https://nowports.com/en/platform · https://blog.nowports.com/es/nowports-el-primer-digital-freight-forwarder-en-latam
- TipRanks — Nowports LATAM push 2026: https://www.tipranks.com/news/private-companies/nowports-deepens-latam-logistics-push-amid-china-trade-bottlenecks-and-new-chile-leadership
- ERP Research — 3PL Multi-Client Operations: https://www.erpresearch.com/industries/logistics-transportation/third-party-logistics
- Guideflow — Best 3PL Software 2026: https://www.guideflow.com/blog/3pl-software
- ValueAdd VC — LatAm Startup Funding 2026: https://valueaddvc.com/blog/latin-america-startup-funding-2026-brazil-mexico-colombia-and-the-state-of-latam-vc
- Y Combinator — Supply Chain & Logistics LATAM: https://www.ycombinator.com/companies/industry/supply-chain-and-logistics
- QuadMinds — Última milla LATAM 2026: https://www.quadminds.com/blog/mejores-apps-ultima-milla-latam-2026/
