import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type {
  AprobacionInterna,
  ContactResult,
  CreateQualitySurveyInput,
  QualityReport,
  QualitySurvey,
  WorkOrder,
} from '@/api/types';
import { ErrorBox, Loading, PageHeader } from '@/components/ui';

const CONTACT_RESULT_LABEL: Record<ContactResult, string> = {
  contestada: 'Contestó',
  cliente_no_desea_participar: 'Cliente no desea participar',
  responsable_no_disponible: 'Responsable no disponible',
  llamada_reprogramada: 'Llamada reprogramada',
  numero_equivocado: 'Número equivocado',
  sin_respuesta_dos_intentos: 'Sin respuesta después de dos intentos',
};
// Nota: se excluye deliberadamente "Encuesta enviada por WhatsApp" — WATI es
// un servicio de paga que no se está usando.
const CONTACT_RESULTS = Object.keys(CONTACT_RESULT_LABEL) as ContactResult[];

type RatingField = 'p1Puntualidad' | 'p2PresentacionTrato' | 'p3ClaridadExplicacion' | 'p4TvCcveo' | 'p5CalidadServicio' | 'p6Limpieza' | 'p7Satisfaccion';

const PREGUNTAS: { key: RatingField; label: string; oficial?: boolean; permiteNoAplica?: boolean }[] = [
  { key: 'p1Puntualidad', label: '1. Puntualidad del técnico' },
  { key: 'p2PresentacionTrato', label: '2. Presentación y trato del técnico' },
  { key: 'p3ClaridadExplicacion', label: '3. Claridad en la explicación del trabajo realizado' },
  { key: 'p4TvCcveo', label: '4. Explicación sobre el servicio de TV Cable y CCVEO', permiteNoAplica: true },
  { key: 'p5CalidadServicio', label: '5. Calidad del servicio (instalación/mantenimiento)' },
  { key: 'p6Limpieza', label: '6. Estado en que dejó el área de trabajo' },
  { key: 'p7Satisfaccion', label: '7. Satisfacción general con la visita', oficial: true },
];

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className="btn btn-sm"
          style={{
            minWidth: 36,
            fontWeight: 700,
            background: value === n ? 'var(--accent)' : undefined,
            borderColor: value === n ? 'var(--accent)' : undefined,
            color: value === n ? '#fff' : undefined,
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function emptyForm() {
  return {
    orderId: null as string | null,
    contactResult: 'contestada' as ContactResult,
    ratings: {} as Partial<Record<RatingField, number>>,
    p4NoAplica: false,
    aprobacionInterna: 'aprobado' as AprobacionInterna,
    comentarioMejora: '',
    firmante: '',
    requiereSeguimiento: false,
    seguimientoTicket: '',
    seguimientoResponsable: '',
    seguimientoFechaLimite: '',
  };
}

export function QualityPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm());

  const orders = useQuery({
    queryKey: ['field-orders-search', search],
    queryFn: () => api<WorkOrder[]>(`/v1/field/work-orders${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  });
  const selectedOrder = orders.data?.find((o) => o.id === form.orderId) ?? null;
  const contestada = form.contactResult === 'contestada';

  const submit = useMutation({
    mutationFn: (input: CreateQualitySurveyInput) =>
      api<QualitySurvey>('/v1/quality/surveys', { method: 'POST', body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quality-report'] });
      setForm(emptyForm());
      setSearch('');
    },
  });

  const faltaEncuesta =
    contestada &&
    PREGUNTAS.some((p) => {
      if (p.key === 'p4TvCcveo' && form.p4NoAplica) return false;
      return form.ratings[p.key] == null;
    });
  const faltaSeguimiento =
    form.requiereSeguimiento &&
    (!form.seguimientoTicket.trim() || !form.seguimientoResponsable.trim() || !form.seguimientoFechaLimite);
  const puedeEnviar = !!form.orderId && !faltaEncuesta && !faltaSeguimiento;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!puedeEnviar || !form.orderId) return;

    const input: CreateQualitySurveyInput = {
      workOrderId: form.orderId,
      contactResult: form.contactResult,
    };
    if (contestada) {
      input.p1Puntualidad = form.ratings.p1Puntualidad;
      input.p2PresentacionTrato = form.ratings.p2PresentacionTrato;
      input.p3ClaridadExplicacion = form.ratings.p3ClaridadExplicacion;
      input.p4NoAplica = form.p4NoAplica;
      if (!form.p4NoAplica) input.p4TvCcveo = form.ratings.p4TvCcveo;
      input.p5CalidadServicio = form.ratings.p5CalidadServicio;
      input.p6Limpieza = form.ratings.p6Limpieza;
      input.p7Satisfaccion = form.ratings.p7Satisfaccion;
      input.aprobacionInterna = form.aprobacionInterna;
      if (form.comentarioMejora.trim()) input.comentarioMejora = form.comentarioMejora.trim();
      if (form.firmante.trim()) input.firmante = form.firmante.trim();
    }
    if (form.requiereSeguimiento) {
      input.requiereSeguimiento = true;
      input.seguimientoTicket = form.seguimientoTicket.trim();
      input.seguimientoResponsable = form.seguimientoResponsable.trim();
      input.seguimientoFechaLimite = form.seguimientoFechaLimite;
    }
    submit.mutate(input);
  }

  return (
    <div>
      <PageHeader
        title="Calidad"
        subtitle="Encuesta de control post-servicio: CSAT oficial y diagnóstico por pregunta"
      />

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'minmax(320px, 420px) 1fr', alignItems: 'start' }}>
        {/* --- Formulario --- */}
        <form onSubmit={onSubmit} className="card card-pad">
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Registrar gestión de llamada</h2>

          <label className="field">
            <span>Buscar orden (número)</span>
            <input
              className="input"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setForm((f) => ({ ...f, orderId: null }));
              }}
              placeholder="ORD-1001…"
            />
          </label>

          {search && orders.isLoading && <Loading />}
          {search && orders.data && orders.data.length > 0 && !form.orderId && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
              {orders.data.slice(0, 6).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="btn btn-sm"
                  style={{ textAlign: 'left' }}
                  onClick={() => setForm((f) => ({ ...f, orderId: o.id }))}
                >
                  <span className="mono">{o.externalNum}</span> — {o.cliente ?? 'sin cliente'} ·{' '}
                  <span className="muted">{o.tecnico ?? '—'}</span>
                </button>
              ))}
            </div>
          )}
          {search && orders.data && orders.data.length === 0 && !orders.isLoading && (
            <p className="muted" style={{ fontSize: 13, marginTop: -8, marginBottom: 14 }}>
              Sin resultados para "{search}".
            </p>
          )}

          {selectedOrder && (
            <div className="card card-pad" style={{ background: 'var(--surface-2)', marginBottom: 16, boxShadow: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="mono" style={{ fontWeight: 700 }}>{selectedOrder.externalNum}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {selectedOrder.cliente ?? '—'} · {selectedOrder.tecnico ?? '—'} · {selectedOrder.actividad ?? '—'}
                  </div>
                </div>
                <button type="button" className="btn btn-sm" onClick={() => setForm((f) => ({ ...f, orderId: null }))}>
                  Cambiar
                </button>
              </div>
            </div>
          )}

          {form.orderId && (
            <>
              <label className="field">
                <span>¿Cómo resultó el contacto?</span>
                <select
                  className="select"
                  value={form.contactResult}
                  onChange={(e) => setForm((f) => ({ ...f, contactResult: e.target.value as ContactResult }))}
                >
                  {CONTACT_RESULTS.map((r) => (
                    <option key={r} value={r}>
                      {CONTACT_RESULT_LABEL[r]}
                    </option>
                  ))}
                </select>
              </label>

              {contestada && (
                <div style={{ marginBottom: 14 }}>
                  <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
                    Escala 1 (muy insatisfecho) a 5 (muy satisfecho).
                  </div>
                  {PREGUNTAS.map((p) => (
                    <div key={p.key} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                        <span style={{ fontSize: 13.5, fontWeight: p.oficial ? 700 : 400 }}>
                          {p.label} {p.oficial && <span className="badge accent">CSAT oficial</span>}
                        </span>
                        {p.permiteNoAplica && (
                          <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={form.p4NoAplica}
                              onChange={(e) => setForm((f) => ({ ...f, p4NoAplica: e.target.checked }))}
                            />
                            No aplica
                          </label>
                        )}
                      </div>
                      <StarRating
                        value={form.ratings[p.key]}
                        disabled={p.permiteNoAplica && form.p4NoAplica}
                        onChange={(v) => setForm((f) => ({ ...f, ratings: { ...f.ratings, [p.key]: v } }))}
                      />
                    </div>
                  ))}

                  <label className="field">
                    <span>¿Algo que podamos mejorar? (opcional)</span>
                    <input
                      className="input"
                      value={form.comentarioMejora}
                      onChange={(e) => setForm((f) => ({ ...f, comentarioMejora: e.target.value }))}
                    />
                  </label>

                  <label className="field">
                    <span>Aprobación interna</span>
                    <select
                      className="select"
                      value={form.aprobacionInterna}
                      onChange={(e) => setForm((f) => ({ ...f, aprobacionInterna: e.target.value as AprobacionInterna }))}
                    >
                      <option value="aprobado">Servicio aprobado</option>
                      <option value="con_observaciones">Servicio con observaciones</option>
                      <option value="no_aprobado">Servicio no aprobado — requiere seguimiento</option>
                    </select>
                  </label>

                  <label className="field">
                    <span>Nombre de quien atendió la llamada (opcional)</span>
                    <input
                      className="input"
                      value={form.firmante}
                      onChange={(e) => setForm((f) => ({ ...f, firmante: e.target.value }))}
                    />
                  </label>
                </div>
              )}

              <div className="card card-pad" style={{ background: 'var(--surface-2)', boxShadow: 'none', marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={form.requiereSeguimiento}
                    onChange={(e) => setForm((f) => ({ ...f, requiereSeguimiento: e.target.checked }))}
                  />
                  Requiere seguimiento
                </label>
                {form.requiereSeguimiento && (
                  <div style={{ marginTop: 12 }}>
                    <label className="field">
                      <span>Número de ticket o gestión asociada</span>
                      <input
                        className="input"
                        value={form.seguimientoTicket}
                        onChange={(e) => setForm((f) => ({ ...f, seguimientoTicket: e.target.value }))}
                      />
                    </label>
                    <label className="field">
                      <span>Responsable del seguimiento</span>
                      <input
                        className="input"
                        value={form.seguimientoResponsable}
                        onChange={(e) => setForm((f) => ({ ...f, seguimientoResponsable: e.target.value }))}
                      />
                    </label>
                    <label className="field" style={{ marginBottom: 0 }}>
                      <span>Fecha límite</span>
                      <input
                        className="input"
                        type="date"
                        value={form.seguimientoFechaLimite}
                        onChange={(e) => setForm((f) => ({ ...f, seguimientoFechaLimite: e.target.value }))}
                      />
                    </label>
                  </div>
                )}
              </div>

              {submit.error && <ErrorBox message={(submit.error as Error).message} />}

              <button className="btn btn-primary" type="submit" disabled={!puedeEnviar || submit.isPending} style={{ width: '100%', marginTop: 8 }}>
                {submit.isPending ? 'Guardando…' : 'Guardar gestión'}
              </button>
            </>
          )}
        </form>

        {/* --- Reporte --- */}
        <QualityReportSection />
      </div>
    </div>
  );
}

function QualityReportSection() {
  const qc = useQueryClient();
  const [days, setDays] = useState(30);
  const report = useQuery({
    queryKey: ['quality-report', days],
    queryFn: () => api<QualityReport>(`/v1/quality/report?days=${days}`),
  });

  const resolver = useMutation({
    mutationFn: ({ id, resuelto }: { id: string; resuelto: boolean }) =>
      api<QualitySurvey>(`/v1/quality/surveys/${id}/seguimiento`, { method: 'PATCH', body: { resuelto } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quality-report'] }),
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>Reporte de calidad</h2>
        <select className="select" style={{ width: 'auto' }} value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Últimos 7 días</option>
          <option value={15}>Últimos 15 días</option>
          <option value={30}>Últimos 30 días</option>
          <option value={60}>Últimos 60 días</option>
          <option value={90}>Últimos 90 días</option>
        </select>
      </div>

      {report.isLoading && <Loading />}
      {report.error && <ErrorBox message={(report.error as Error).message} />}

      {report.data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 20 }}>
            <StatTile
              label="CSAT oficial (P7: 4-5)"
              value={report.data.csat != null ? `${report.data.csat.toFixed(1)}%` : '—'}
              tone={report.data.csat == null ? undefined : report.data.csat >= 70 ? 'good' : report.data.csat >= 50 ? 'warn' : 'bad'}
            />
            <StatTile label="Gestiones registradas" value={report.data.totalGestiones} />
            <StatTile label="Respuestas válidas" value={report.data.totalRespuestasValidas} />
          </div>

          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: 20 }}>
            <div className="card card-pad">
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Resultado de las gestiones</h3>
              <BarList
                rows={report.data.porResultado.map((r) => ({ key: CONTACT_RESULT_LABEL[r.key as ContactResult] ?? r.key, count: r.count }))}
              />
            </div>
            <div className="card card-pad">
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Diagnóstico por pregunta (1-5)</h3>
              <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
                Promedio de las 6 preguntas de diagnóstico — indica exactamente qué mejorar.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {report.data.diagnostico.map((d) => (
                  <div key={d.campo} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13 }}>{d.etiqueta}</div>
                      <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 3, marginTop: 3 }}>
                        <div
                          style={{
                            height: 5,
                            width: `${((d.promedio ?? 0) / 5) * 100}%`,
                            background: 'var(--teal)',
                            borderRadius: 3,
                          }}
                        />
                      </div>
                    </div>
                    <div className="num" style={{ fontWeight: 700, fontSize: 13 }}>
                      {d.promedio != null ? d.promedio.toFixed(1) : '—'}{' '}
                      <span className="muted" style={{ fontWeight: 400, fontSize: 11 }}>({d.respuestas})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <section className="card">
            <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>
                Seguimientos pendientes{' '}
                {report.data.seguimientosPendientes.length > 0 && (
                  <span className="badge warn">{report.data.seguimientosPendientes.length}</span>
                )}
              </h3>
            </div>
            {report.data.seguimientosPendientes.length === 0 && (
              <div className="empty">Sin seguimientos pendientes. 🎉</div>
            )}
            {report.data.seguimientosPendientes.length > 0 && (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Orden</th>
                      <th>Motivo</th>
                      <th>Ticket</th>
                      <th>Responsable</th>
                      <th>Fecha límite</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.data.seguimientosPendientes.map((s) => (
                      <tr key={s.id}>
                        <td className="mono" style={{ fontWeight: 600 }}>{s.externalNum}</td>
                        <td className="muted">{CONTACT_RESULT_LABEL[s.contactResult]}</td>
                        <td className="mono">{s.seguimientoTicket ?? '—'}</td>
                        <td className="muted">{s.seguimientoResponsable ?? '—'}</td>
                        <td className="mono">{s.seguimientoFechaLimite ?? '—'}</td>
                        <td>
                          <button
                            className="btn btn-sm"
                            disabled={resolver.isPending}
                            onClick={() => resolver.mutate({ id: s.id, resuelto: true })}
                          >
                            Marcar resuelto
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: string | number; tone?: 'good' | 'warn' | 'bad' }) {
  const color = tone ? `var(--${tone})` : 'var(--accent)';
  return (
    <div className="card card-pad">
      <div className="num" style={{ fontFamily: 'Archivo', fontWeight: 900, fontSize: 26, color, lineHeight: 1 }}>
        {value}
      </div>
      <div className="muted" style={{ fontSize: 12.5, marginTop: 5 }}>{label}</div>
    </div>
  );
}

function BarList({ rows }: { rows: { key: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (rows.length === 0) return <div className="muted" style={{ fontSize: 14 }}>Sin datos.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((r) => (
        <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13 }}>{r.key}</div>
            <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 3, marginTop: 3 }}>
              <div style={{ height: 5, width: `${(r.count / max) * 100}%`, background: 'var(--accent)', borderRadius: 3 }} />
            </div>
          </div>
          <div className="num" style={{ fontWeight: 700, fontSize: 13 }}>{r.count}</div>
        </div>
      ))}
    </div>
  );
}
