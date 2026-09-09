import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { ConteoEtiqueta, ReportesBoard, SegmentoStats } from '@/api/types';
import { ErrorBox, Loading, PageHeader } from '@/components/ui';

export function ReportesPage() {
  const board = useQuery({
    queryKey: ['field-reportes'],
    queryFn: () => api<ReportesBoard>('/v1/field/reportes'),
  });

  return (
    <div>
      <PageHeader
        title="Centro de Reportes"
        subtitle="KPIs del día, tablero de carga (retraso, SOP/Instalaciones/Plex) y consolidado por segmento"
      />

      {board.isLoading && <Loading />}
      {board.error && <ErrorBox message={(board.error as Error).message} />}

      {board.data && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 14,
              marginBottom: 24,
            }}
          >
            <StatTile label="Pendientes asignadas" value={board.data.kpis.pendientesAsignadas} />
            <StatTile label="Cerradas hoy" value={board.data.kpis.cerradasHoy} tone="good" />
            <StatTile label="Técnicos en ruta" value={board.data.kpis.tecnicosEnRuta} />
            <StatTile label="Caídas / offline" value={board.data.kpis.caidasOffline} tone="bad" />
            <StatTile label="Total general" value={board.data.kpis.totalGeneral} />
          </div>

          <div className="card card-pad" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Resumen de retraso (pendientes)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {board.data.tablero.resumenRetraso.map((r) => {
                const max = Math.max(1, ...board.data!.tablero.resumenRetraso.map((x) => x.cantidad));
                return (
                  <div key={r.categoria} style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 10, alignItems: 'center' }}>
                    <div style={{ fontSize: 13.5 }}>{r.categoria}</div>
                    <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 3 }}>
                      <div
                        style={{
                          height: 5,
                          width: `${(r.cantidad / max) * 100}%`,
                          background: r.categoria === '>= 7 Dia' ? 'var(--red, #c92a2a)' : 'var(--orange, #e8590c)',
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    <div className="num" style={{ fontWeight: 700, fontSize: 14 }}>{r.cantidad}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: 24 }}>
            <ConteoCard
              title="SOP / Mantenimiento"
              rows={board.data.tablero.sop}
              footer={
                board.data.tablero.excedenDosHoras > 0
                  ? `${board.data.tablero.excedenDosHoras} exceden 2h sin resolver`
                  : undefined
              }
            />
            <ConteoCard title="Instalaciones" rows={board.data.tablero.instalaciones} />
            <ConteoCard title="Plex" rows={board.data.tablero.plex} />
          </div>

          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <SegmentoCard title="Residencial" stats={board.data.segmentos.residencial} />
            <SegmentoCard title="Plex" stats={board.data.segmentos.plex} />
            <SegmentoCard title="Global" stats={board.data.segmentos.global} />
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone?: 'good' | 'bad' }) {
  const color = tone === 'good' ? 'var(--teal)' : tone === 'bad' ? 'var(--red, #c92a2a)' : 'var(--ink)';
  return (
    <div className="card card-pad">
      <div className="num" style={{ fontFamily: 'Archivo', fontWeight: 900, fontSize: 30, color, lineHeight: 1 }}>
        {value}
      </div>
      <div className="muted" style={{ fontSize: 13, marginTop: 5 }}>{label}</div>
    </div>
  );
}

function ConteoCard({ title, rows, footer }: { title: string; rows: ConteoEtiqueta[]; footer?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.cantidad));
  return (
    <div className="card card-pad">
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{title}</h3>
      {rows.length === 0 ? (
        <div className="muted" style={{ fontSize: 14 }}>Sin pendientes en esta categoría.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((r) => (
            <div key={r.etiqueta} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5 }}>{r.etiqueta}</div>
                <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 3, marginTop: 3 }}>
                  <div style={{ height: 5, width: `${(r.cantidad / max) * 100}%`, background: 'var(--teal)', borderRadius: 3 }} />
                </div>
              </div>
              <div className="num" style={{ fontWeight: 700, fontSize: 14 }}>{r.cantidad}</div>
            </div>
          ))}
        </div>
      )}
      {footer && (
        <div className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
          <span className="badge bad">{footer}</span>
        </div>
      )}
    </div>
  );
}

function SegmentoCard({ title, stats }: { title: string; stats: SegmentoStats }) {
  return (
    <div className="card card-pad">
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{title}</h3>
      <SegmentoFila label="Global" total={stats.totalGlobal} cerradas={stats.cerradasGlobal} pct={stats.pctGlobal} />
      <SegmentoFila label="En mora" total={stats.totalMora} cerradas={stats.cerradasMora} pct={stats.pctMora} />
      <SegmentoFila label="De hoy" total={stats.totalHoy} cerradas={stats.cerradasHoy} pct={stats.pctHoy} />
    </div>
  );
}

function SegmentoFila({ label, total, cerradas, pct }: { label: string; total: number; cerradas: number; pct: number }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
        <span className="muted">{label}</span>
        <span>
          {cerradas} / {total} <span className="muted">({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3 }}>
        <div style={{ height: 6, width: `${Math.min(100, pct)}%`, background: 'var(--accent)', borderRadius: 3 }} />
      </div>
    </div>
  );
}
