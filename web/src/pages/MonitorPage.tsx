import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { FieldBoard, GanttRow, IngestResult, WorkOrder } from '@/api/types';
import { ErrorBox, Loading, PageHeader } from '@/components/ui';
import { GanttChart } from '@/components/GanttChart';
import { MultiSelect } from '@/components/MultiSelect';

function estadoClass(estado: string | null): string {
  const e = (estado ?? '').toUpperCase();
  if (e === 'CERRADA' || e === 'INSTALADA') return 'good';
  if (e === 'NOINSTALADO' || e === 'CANCELADA') return 'bad';
  if (e === 'ASIGNADA' || e === 'EN PROCESO') return 'teal';
  if (e === 'REPROGRAMADA' || e === 'PENDIENTE') return 'warn';
  return '';
}

/** 'YYYY-MM-DD' de hoy en hora de Honduras (para que el Gantt abra en el día correcto). */
function hoyHN(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' });
}

export function MonitorPage() {
  const qc = useQueryClient();
  const [estado, setEstado] = useState<string[]>([]);
  const [actividad, setActividad] = useState<string[]>([]);
  const [motivo, setMotivo] = useState<string[]>([]);
  const [criticas, setCriticas] = useState(false);
  const [noAsignadas, setNoAsignadas] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [fechaGantt, setFechaGantt] = useState(hoyHN());

  const board = useQuery({ queryKey: ['field-board'], queryFn: () => api<FieldBoard>('/v1/field/board') });

  const orders = useQuery({
    queryKey: ['field-orders', estado, actividad, motivo, criticas, noAsignadas, fechaDesde, fechaHasta],
    queryFn: () => {
      const params = new URLSearchParams();
      if (estado.length) params.set('estado', estado.join(','));
      if (actividad.length) params.set('actividad', actividad.join(','));
      if (motivo.length) params.set('motivo', motivo.join(','));
      if (criticas) params.set('criticas', 'true');
      if (noAsignadas) params.set('noAsignadas', 'true');
      if (fechaDesde) params.set('from', fechaDesde);
      if (fechaHasta) params.set('to', fechaHasta);
      const qs = params.toString();
      return api<WorkOrder[]>(`/v1/field/work-orders${qs ? `?${qs}` : ''}`);
    },
  });

  const gantt = useQuery({
    queryKey: ['field-gantt', fechaGantt],
    queryFn: () => api<GanttRow[]>(`/v1/field/gantt?date=${fechaGantt}`),
  });

  const sync = useMutation({
    mutationFn: () => api<IngestResult>('/v1/field/ingest', { method: 'POST', body: {} }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['field-board'] });
      qc.invalidateQueries({ queryKey: ['field-orders'] });
      qc.invalidateQueries({ queryKey: ['field-gantt'] });
    },
  });

  const hayFiltroFecha = Boolean(fechaDesde || fechaHasta);

  const filtrosActivos: string[] = [];
  if (criticas) filtrosActivos.push('🚨 Ver solo Críticas — oculta Plex, PEXTERNO, SPLITTEROPT e instalaciones');
  if (noAsignadas) filtrosActivos.push('🚨 Ver NO Asignadas — oculta todas las órdenes que ya tienen técnico');
  if (actividad.length) filtrosActivos.push(`🛠️ Actividad: ${actividad.join(', ')}`);
  if (estado.length) filtrosActivos.push(`🚦 Estado: ${estado.join(', ')}`);
  if (motivo.length) filtrosActivos.push(`⚠️ Motivo: ${motivo.join(', ')}`);

  return (
    <div>
      <PageHeader
        title="Monitor operativo"
        subtitle="Órdenes de campo (telecom) ingeridas desde Cepheus"
        actions={
          <button className="btn btn-primary" onClick={() => sync.mutate()} disabled={sync.isPending}>
            {sync.isPending ? 'Sincronizando…' : 'Sincronizar ahora'}
          </button>
        }
      />

      {sync.data && (
        <div className="card card-pad" style={{ marginBottom: 16, fontSize: 14 }}>
          Sincronización: <b>{sync.data.fetched}</b> descargadas · <b>{sync.data.created}</b> nuevas ·{' '}
          <b>{sync.data.updated}</b> actualizadas.
        </div>
      )}

      {board.isLoading && <Loading />}
      {board.error && <ErrorBox message={(board.error as Error).message} />}

      {board.data && (
        <>
          {board.data.lastIngest && (
            <p className="mono muted" style={{ fontSize: 12.5, marginTop: -8, marginBottom: 16 }}>
              Última ingesta: {new Date(board.data.lastIngest.ranAt).toLocaleString('es')} ·{' '}
              {board.data.lastIngest.fetched} órdenes · {board.data.lastIngest.status}
            </p>
          )}

          {/* Tiles por estado (clic para filtrar) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 14,
              marginBottom: 24,
            }}
          >
            <button
              type="button"
              className="tile-btn"
              onClick={() => setEstado([])}
              style={tileStyle(estado.length === 0)}
            >
              <div className="num" style={{ fontFamily: 'Archivo', fontWeight: 900, fontSize: 30, color: 'var(--accent)', lineHeight: 1 }}>
                {board.data.total}
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 5 }}>Total órdenes</div>
            </button>
            {board.data.byEstado.map((g) => (
              <button
                key={g.key}
                type="button"
                className="tile-btn"
                onClick={() => setEstado(estado.length === 1 && estado[0] === g.key ? [] : [g.key])}
                style={tileStyle(estado.length === 1 && estado[0] === g.key)}
              >
                <div className="num" style={{ fontFamily: 'Archivo', fontWeight: 900, fontSize: 30, lineHeight: 1 }}>
                  {g.count}
                </div>
                <div style={{ marginTop: 6 }}>
                  <span className={`badge ${estadoClass(g.key)}`}>{g.key.toLowerCase()}</span>
                </div>
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', marginBottom: 24 }}>
            <GroupCard title="Por actividad" rows={board.data.byActividad} />
            <GroupCard title="Por técnico" rows={board.data.byTecnico} />
          </div>
        </>
      )}

      <section className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Línea de tiempo por técnico (Gantt)</h2>
          <input
            className="input"
            type="date"
            style={{ width: 'auto' }}
            value={fechaGantt}
            max={hoyHN()}
            onChange={(e) => setFechaGantt(e.target.value)}
          />
        </div>
        <div style={{ padding: 20 }}>
          {gantt.isLoading && <Loading />}
          {gantt.error && <ErrorBox message={(gantt.error as Error).message} />}
          {gantt.data && <GanttChart date={fechaGantt} rows={gantt.data} />}
        </div>
      </section>

      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>
            Órdenes {estado.length > 0 && <span className={`badge ${estadoClass(estado[0])}`} style={{ marginLeft: 8 }}>{estado.join(', ').toLowerCase()}</span>}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input className="input" type="date" style={{ width: 'auto' }} value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            <span className="muted" style={{ fontSize: 13 }}>a</span>
            <input className="input" type="date" style={{ width: 'auto' }} value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            {(estado.length > 0 || hayFiltroFecha || actividad.length > 0 || motivo.length > 0 || criticas || noAsignadas) && (
              <button
                className="btn btn-sm"
                onClick={() => {
                  setEstado([]);
                  setActividad([]);
                  setMotivo([]);
                  setCriticas(false);
                  setNoAsignadas(false);
                  setFechaDesde('');
                  setFechaHasta('');
                }}
              >
                Quitar filtros
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
          <span className="muted" style={{ fontSize: 12.5, marginRight: 2 }}>🎛️ Filtros:</span>
          {board.data && (
            <>
              <MultiSelect label="🛠️ Tipo de Actividad" options={board.data.byActividad} selected={actividad} onChange={setActividad} />
              <MultiSelect label="🚦 Estado de Orden" options={board.data.byEstado} selected={estado} onChange={setEstado} />
              <MultiSelect label="⚠️ Motivo / Diagnóstico" options={board.data.byMotivo} selected={motivo} onChange={setMotivo} />
            </>
          )}
          <button
            type="button"
            className="btn btn-sm"
            style={criticas ? { borderColor: 'var(--red, #c92a2a)', color: 'var(--red, #c92a2a)' } : undefined}
            onClick={() => setCriticas((v) => !v)}
          >
            🚨 Ver solo Críticas
          </button>
          <button
            type="button"
            className="btn btn-sm"
            style={noAsignadas ? { borderColor: 'var(--red, #c92a2a)', color: 'var(--red, #c92a2a)' } : undefined}
            onClick={() => setNoAsignadas((v) => !v)}
          >
            🚨 Ver NO Asignadas
          </button>
        </div>

        {filtrosActivos.length > 0 && (
          <div className="card-pad" style={{ background: 'var(--accent-soft)', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
            <b>Hay filtros activos ocultando información:</b>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              {filtrosActivos.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            {orders.data && (
              <p className="muted" style={{ margin: '6px 0 0' }}>
                Se están mostrando <b>{orders.data.length}</b> órdenes con estos filtros.
              </p>
            )}
          </div>
        )}

        {orders.isLoading && <Loading />}
        {orders.data && orders.data.length === 0 && (
          <div className="empty">Sin órdenes. Pulsa "Sincronizar ahora" para traerlas de Cepheus.</div>
        )}
        {orders.data && orders.data.length > 0 && (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Estado</th>
                  <th>Actividad</th>
                  <th>Técnico</th>
                  <th>Cliente</th>
                  <th>OLT / PON</th>
                </tr>
              </thead>
              <tbody>
                {orders.data.map((o) => (
                  <tr key={o.id}>
                    <td className="mono" style={{ fontWeight: 600 }}>{o.externalNum}</td>
                    <td><span className={`badge ${estadoClass(o.estado)}`}>{(o.estado ?? '—').toLowerCase()}</span></td>
                    <td className="muted">{o.actividad ?? '—'}</td>
                    <td className="muted">{o.tecnico ?? '—'}</td>
                    <td className="muted">{o.cliente ?? '—'}</td>
                    <td className="mono muted">{o.olt ?? '—'}{o.pon ? ` · ${o.pon}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function tileStyle(active: boolean): React.CSSProperties {
  return {
    textAlign: 'left',
    background: active ? 'var(--accent-soft)' : 'var(--surface)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 12,
    boxShadow: 'var(--shadow)',
    padding: 16,
    cursor: 'pointer',
    font: 'inherit',
    color: 'var(--ink)',
  };
}

function GroupCard({ title, rows }: { title: string; rows: { key: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="card card-pad">
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{title}</h3>
      {rows.length === 0 && <div className="muted" style={{ fontSize: 14 }}>Sin datos.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r) => (
          <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.key}</div>
              <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 3, marginTop: 3 }}>
                <div style={{ height: 5, width: `${(r.count / max) * 100}%`, background: 'var(--teal)', borderRadius: 3 }} />
              </div>
            </div>
            <div className="num" style={{ fontWeight: 700, fontSize: 14 }}>{r.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
