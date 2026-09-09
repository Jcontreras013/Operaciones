import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { OfflineBoard, OltPonRow } from '@/api/types';
import { ErrorBox, Loading, PageHeader } from '@/components/ui';

export function OfflinePage() {
  const board = useQuery({
    queryKey: ['field-offline'],
    queryFn: () => api<OfflineBoard>('/v1/field/offline'),
  });

  return (
    <div>
      <PageHeader
        title="Red: offline y saturación OLT/PON"
        subtitle="Diagnóstico de fallas de red (soportes de fibra) — dónde se concentran y por qué"
      />

      {board.isLoading && <Loading />}
      {board.error && <ErrorBox message={(board.error as Error).message} />}

      {board.data && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 14,
              marginBottom: 24,
            }}
          >
            <StatTile label="Offline ahora" value={board.data.totalOffline} tone="bad" />
            <StatTile label="Alerta > 2h sin resolver" value={board.data.totalAlertaTiempo} tone="warn" />
          </div>

          <div className="card card-pad" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Causa raíz (soportes cerrados, 30 días)</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
              Se clasifica la razón de cierre + comentario del técnico. Incluye falsos positivos: no todo lo que
              se reporta como offline es una falla de red.
            </p>
            {board.data.porCausa.length === 0 && (
              <div className="muted" style={{ fontSize: 14 }}>Sin soportes de fibra cerrados en el periodo.</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {board.data.porCausa.map((c) => {
                const max = Math.max(1, ...board.data!.porCausa.map((r) => r.count));
                return (
                  <div key={c.key} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5 }}>{c.key}</div>
                      <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 3, marginTop: 3 }}>
                        <div style={{ height: 5, width: `${(c.count / max) * 100}%`, background: 'var(--teal)', borderRadius: 3 }} />
                      </div>
                    </div>
                    <div className="num" style={{ fontWeight: 700, fontSize: 14 }}>{c.count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginBottom: 24 }}>
            <OltTable title="Mapa por OLT" rows={board.data.porOlt} showPon={false} />
            <OltTable title="Mapa por OLT / PON" rows={board.data.porPon} showPon />
          </div>

          <section className="card">
            <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Órdenes offline (abiertas)</h2>
            </div>
            {board.data.ordenes.length === 0 && (
              <div className="empty">Sin equipos caídos reportados en este momento. 🎉</div>
            )}
            {board.data.ordenes.length > 0 && (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Orden</th>
                      <th>Alerta</th>
                      <th>Técnico</th>
                      <th>Cliente</th>
                      <th>OLT / PON</th>
                      <th>Comentario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {board.data.ordenes.map((o) => (
                      <tr key={o.id}>
                        <td className="mono" style={{ fontWeight: 600 }}>{o.externalNum}</td>
                        <td>
                          {o.alertaTiempo ? (
                            <span className="badge bad">&gt; 2h sin resolver</span>
                          ) : (
                            <span className="badge teal">reciente</span>
                          )}
                        </td>
                        <td className="muted">{o.tecnico ?? '—'}</td>
                        <td className="muted">{o.cliente ?? '—'}</td>
                        <td className="mono muted">{o.olt ?? '—'}{o.pon ? ` · ${o.pon}` : ''}</td>
                        <td className="muted">{o.comentario ?? '—'}</td>
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

function StatTile({ label, value, tone }: { label: string; value: number; tone: 'bad' | 'warn' }) {
  const color = tone === 'bad' ? 'var(--red, #c92a2a)' : 'var(--orange, #e8590c)';
  return (
    <div className="card card-pad">
      <div className="num" style={{ fontFamily: 'Archivo', fontWeight: 900, fontSize: 30, color, lineHeight: 1 }}>
        {value}
      </div>
      <div className="muted" style={{ fontSize: 13, marginTop: 5 }}>{label}</div>
    </div>
  );
}

function OltTable({ title, rows, showPon }: { title: string; rows: OltPonRow[]; showPon: boolean }) {
  return (
    <div className="card">
      <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>{title}</h3>
      </div>
      {rows.length === 0 ? (
        <div className="empty">Sin órdenes con OLT registrado.</div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>OLT</th>
                {showPon && <th>PON</th>}
                <th>Total</th>
                <th>Offline</th>
                <th>% saturación</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const pct = r.total > 0 ? Math.round((r.offline / r.total) * 100) : 0;
                return (
                  <tr key={`${r.olt}-${r.pon}-${i}`}>
                    <td className="mono">{r.olt}</td>
                    {showPon && <td className="mono muted">{r.pon}</td>}
                    <td className="num">{r.total}</td>
                    <td className="num">{r.offline}</td>
                    <td>
                      <span className={`badge ${pct > 0 ? 'bad' : ''}`}>{pct}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
