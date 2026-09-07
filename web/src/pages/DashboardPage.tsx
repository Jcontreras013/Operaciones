import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { Board, ExceptionRow } from '@/api/types';
import { ErrorBox, Loading, PageHeader, StatusBadge } from '@/components/ui';

const STATUS_LABELS: Record<string, string> = {
  created: 'Creadas',
  in_transit: 'En tránsito',
  in_warehouse: 'En almacén',
  delivered: 'Entregadas',
  closed: 'Cerradas',
};

export function DashboardPage() {
  const board = useQuery({ queryKey: ['board'], queryFn: () => api<Board>('/v1/visibility/board') });
  const exceptions = useQuery({
    queryKey: ['exceptions'],
    queryFn: () => api<ExceptionRow[]>('/v1/visibility/exceptions'),
  });

  return (
    <div>
      <PageHeader title="Tablero" subtitle="Estado de las operaciones y alertas de excepción" />

      {board.isLoading && <Loading />}
      {board.error && <ErrorBox message={(board.error as Error).message} />}

      {board.data && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 14,
              marginBottom: 24,
            }}
          >
            <StatTile label="Total" value={board.data.total} accent />
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <StatTile key={key} label={label} value={board.data!.byStatus[key] ?? 0} />
            ))}
          </div>

          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0, 1fr)' }}>
            <section className="card">
              <SectionTitle>Excepciones</SectionTitle>
              {exceptions.isLoading && <Loading />}
              {exceptions.data && exceptions.data.length === 0 && (
                <div className="empty">Sin excepciones. Todo en orden. ✓</div>
              )}
              {exceptions.data && exceptions.data.length > 0 && (
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Referencia</th>
                        <th>Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exceptions.data.map((e) => (
                        <tr key={`${e.type}-${e.operationId}`}>
                          <td>
                            <span className={`badge ${e.type === 'stale' ? 'warn' : 'bad'}`}>
                              {e.type === 'stale' ? 'demorada' : 'sin POD'}
                            </span>
                          </td>
                          <td>
                            <Link to={`/operations/${e.operationId}`}>{e.reference}</Link>
                          </td>
                          <td className="muted">{e.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="card">
              <SectionTitle>Operaciones recientes</SectionTitle>
              {board.data.operations.length === 0 ? (
                <div className="empty">Aún no hay operaciones.</div>
              ) : (
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Referencia</th>
                        <th>Estado</th>
                        <th>Origen → Destino</th>
                      </tr>
                    </thead>
                    <tbody>
                      {board.data.operations.slice(0, 10).map((op) => (
                        <tr key={op.id}>
                          <td>
                            <Link to={`/operations/${op.id}`}>{op.reference}</Link>
                          </td>
                          <td>
                            <StatusBadge status={op.status} />
                          </td>
                          <td className="muted">
                            {op.origin ?? '—'} → {op.destination ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="card card-pad" style={{ padding: 16 }}>
      <div
        className="num"
        style={{
          fontFamily: 'Archivo, sans-serif',
          fontWeight: 900,
          fontSize: 30,
          color: accent ? 'var(--accent)' : 'var(--ink)',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div className="muted" style={{ fontSize: 13, marginTop: 5 }}>
        {label}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 16,
        fontWeight: 700,
        padding: '15px 20px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {children}
    </h2>
  );
}
