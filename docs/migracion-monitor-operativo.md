# Plan de migración — Monitor Operativo Maxcom → Operaciones

> Objetivo (definido por el equipo): **unificar todo en Operaciones**, es decir, reconstruir lo
> que hoy hace `monitor-operativo` sobre la arquitectura nueva (NestJS + React + PostgreSQL),
> hasta tener un solo producto.

**Fecha:** Septiembre 2026 · **Estado:** Evaluación y plan (v1)

---

## 1. Qué es hoy `monitor-operativo`

Dashboard de **operación de campo telecom (FTTH)** de Maxcom, en **Python + Streamlit**
(~16.300 líneas). No comparte código con Operaciones.

**Funciones (del menú y módulos):**
- **Monitor** (vista diaria): órdenes en tiempo real, resumen de pendientes, reprogramadas /
  no instalados, agendadas a futuro, cerradas por hora, NOINSTALADO del día, **diagnóstico de
  offline (causa raíz)** y **análisis de red por OLT/PON**.
- **Reportes**: centro único de reportes operativos, archivo de cierre de jornada.
- **Calidad** (`ccalidad`), **Auditoría de visitas** (`auditorv`), **Biometría/asistencia**
  (`biometrico`), **Expedientes** con `requests` + OCR (`expediente`), **Tiempos operativos**
  (`tiempot`), **Vehículos/GPS** (`gps.txt`, enlaces SkyTrack).
- **Clasificador**: fuente única de verdad para clasificar actividades PLEX
  (PEXTERNO/SPLITTEROPT/…) y definir el "día operativo".

**Fuentes de datos:**
- **API Cepheus** (`consultar_api_ordenes`, POST con payload+headers) → órdenes/dispositivos.
- **Google Sheets** (`gspread`/`st-gsheets-connection`) como base principal + **Google Cloud
  Storage** como espejo.
- Archivos planos `.txt` (personal SAC, personal técnico, enlaces GPS) como "tablas".

**Tamaño por módulo:** app.py 5.160, tools.py 4.532, expediente.py 2.367, tiempot.py 1.024,
auditorv.py 876, ccalidad.py 579, settings.py 527, biometrico.py 422, sync_job.py 221.

---

## 2. Lo que NO hay que reconstruir (ya lo da Operaciones)

La plataforma nueva ya resuelve la "fundación" que el monitor hoy no tiene:

| Capacidad | Operaciones (hoy) | Monitor (hoy) |
|-----------|-------------------|---------------|
| Base de datos real | PostgreSQL + migraciones | Google Sheets + GCS + `.txt` |
| API / integración | REST + Swagger + JWT | — (todo dentro del Streamlit) |
| Multi-tenant + roles | Sí | No |
| Bus de eventos | Sí (outbox) | No |
| Frontend | React + Vite (consola) | Streamlit (monolito) |
| Despliegue | Render + Postgres, migraciones | Streamlit |

**Conclusión:** no migramos "de Streamlit a Streamlit". Usamos Operaciones como **esqueleto**
y portamos el **dominio telecom** encima como módulos nuevos.

---

## 3. Estrategia: *strangler-fig* (estrangulamiento gradual)

El monitor sigue **vivo y en uso** mientras migramos función por función. Nada de "big bang".

1. **Ingesta primero.** Traer la data de la API Cepheus a PostgreSQL (un módulo de ingestión +
   un job programado que reemplaza a `sync_job.py`). Con la data ya en nuestra BD, cada vista
   nueva se construye leyendo Postgres, no Sheets.
2. **Vista núcleo después.** Reconstruir el **Monitor diario** (órdenes + pendientes + offline)
   en React, que es el uso de todos los días.
3. **Módulos de valor decreciente.** Calidad, reportes, OLT/PON, auditoría, biometría,
   expedientes/OCR, vehículos — en orden de uso/valor.
4. **Corte.** Cuando la vista nueva iguala a la del monitor, se apaga esa parte del Streamlit.

**Config plana → tablas.** El personal (SAC/técnico) y los enlaces GPS pasan de `.txt` a tablas
Postgres desde el inicio (es poco volumen y desbloquea todo lo demás).

---

## 4. Mapa de features → módulos nuevos

| Feature del monitor | Módulo nuevo (backend NestJS) | Reusa de Operaciones |
|---------------------|-------------------------------|----------------------|
| Ingesta API Cepheus + job | `field-ingest` (conector + cron) | Patrón de conector enchufable (como ERP/optimizador) |
| Órdenes de campo + estados | `work-orders` (registro + hitos) | El patrón de `operations` + eventos |
| Personal SAC/técnico | `staff` | Multi-tenant, auth |
| Diagnóstico offline / OLT-PON | `network` (analítica) | Read model como `visibility` |
| Calidad / auditoría | `quality` | Eventos + read model |
| Biometría / asistencia | `attendance` | — |
| Expedientes + OCR | `records` (+ almacenamiento de archivos) | `documents` de operación |
| Vehículos / GPS | `fleet` (ya existe embrión en `delivery`) | `Vehicle` + rutas |
| Reportes / cierre de jornada | `reports` | Consultas sobre el read model |

El **frontend** agrega estas vistas a la consola React ya existente (mismo shell, auth y diseño).

---

## 5. Roadmap por fases

- **Fase A — Ingesta + datos maestros (primer entregable).**
  Módulo `field-ingest` que consume la API Cepheus y persiste órdenes/dispositivos en Postgres;
  tablas de personal y GPS; un job programado. Entregable demostrable: "las órdenes del día ya
  están en nuestra BD y consultables por API".
- **Fase B — Monitor diario (React).** Vista de órdenes en tiempo real + pendientes + cerradas
  por hora + NOINSTALADO, leyendo de Postgres. Es el reemplazo del uso diario.
- **Fase C — Offline & Red (OLT/PON).** Diagnóstico de causa raíz y análisis de red.
- **Fase D — Calidad, auditoría, reportes.**
- **Fase E — Biometría, expedientes/OCR, vehículos.**
- **Fase F — Corte final** y apagado del Streamlit.

---

## 6. Decisiones y riesgos a resolver

1. **Dominio distinto.** Operaciones nació como 3PL/logística; el monitor es telecom FTTH.
   Los módulos nuevos son de dominio telecom — reusamos *patrones* (registro único, eventos,
   read model, conectores), no las entidades de logística.
2. **Secretos y datos personales en el repo (importante).** `monitor-operativo` es **público** y
   contiene **tokens de GPS (SkyTrack)** y **nombres de personal** en archivos `.txt`. Al migrar,
   esos secretos deben ir a variables de entorno / configuración segura, y los datos personales a
   la BD con control de acceso. Conviene además rotar los tokens expuestos.
3. **¿Migrar Google Sheets a Postgres o mantenerlo?** Recomendado migrar a Postgres (fuente única
   de verdad); si hay usuarios que editan en Sheets, evaluar una sincronización de transición.
4. **Credenciales de la API Cepheus / Google.** Las necesita el módulo de ingesta como env vars
   (no en el repo).
5. **Despliegue.** El monitor nuevo vive en el mismo Render que Operaciones; el job de ingesta es
   un *cron job* de Render.

---

## 7. Recomendación

Empezar por la **Fase A (ingesta + datos maestros)**: es la base de todo y entrega valor medible
sin tocar aún la UI. Para arrancarla necesito de tu lado, como configuración (no en el repo):
- Cómo se autentica y qué devuelve la **API Cepheus** (endpoint, headers/token, forma de la
  respuesta) — con un ejemplo de payload/respuesta basta.
- Si mantenemos o migramos Google Sheets.

> Siguiente paso sugerido: definir el acceso a Cepheus y construir el módulo `field-ingest`
> (conector + persistencia + job) como primer incremento de la unificación.
