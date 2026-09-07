import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Milestone, Operation, OperationStatus } from '@/api/types';
import { ErrorBox, Loading, PageHeader, StatusBadge } from '@/components/ui';

const STATUSES: OperationStatus[] = ['created', 'in_transit', 'in_warehouse', 'delivered', 'closed'];

export function OperationDetailPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();

  const operation = useQuery({
    queryKey: ['operation', id],
    queryFn: () => api<Operation>(`/v1/operations/${id}`),
  });
  const milestones = useQuery({
    queryKey: ['operation', id, 'milestones'],
    queryFn: () => api<Milestone[]>(`/v1/operations/${id}/milestones`),
  });

  const [status, setStatus] = useState<OperationStatus>('in_transit');
  const [note, setNote] = useState('');

  const addMilestone = useMutation({
    mutationFn: () =>
      api<Milestone>(`/v1/operations/${id}/milestones`, {
        method: 'POST',
        body: { status, note: note || undefined },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operation', id] });
      qc.invalidateQueries({ queryKey: ['operation', id, 'milestones'] });
      setNote('');
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    addMilestone.mutate();
  }

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Link to="/operations" className="mono" style={{ fontSize: 13 }}>
          ← Operaciones
        </Link>
      </div>

      {operation.isLoading && <Loading />}
      {operation.error && <ErrorBox message={(operation.error as Error).message} />}

      {operation.data && (
        <>
          <PageHeader
            title={operation.data.reference}
            subtitle={`${operation.data.origin ?? '—'} → ${operation.data.destination ?? '—'} · ${operation.data.serviceType}`}
            actions={<StatusBadge status={operation.data.status} />}
          />

          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0, 1fr)' }}>
            <section className="card card-pad">
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Registrar hito</h2>
              <form onSubmit={onSubmit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <label className="field" style={{ marginBottom: 0, minWidth: 160 }}>
                  <span>Estado</span>
                  <select className="select" value={status} onChange={(e) => setStatus(e.target.value as OperationStatus)}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
                  <span>Nota</span>
                  <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
                </label>
                <button className="btn btn-primary" disabled={addMilestone.isPending}>
                  {addMilestone.isPending ? 'Guardando…' : 'Agregar'}
                </button>
              </form>
              {addMilestone.error && (
                <div style={{ marginTop: 12 }}>
                  <ErrorBox message={(addMilestone.error as Error).message} />
                </div>
              )}
            </section>

            <section className="card card-pad">
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Línea de tiempo</h2>
              {milestones.isLoading && <Loading />}
              {milestones.data && milestones.data.length === 0 && <div className="empty">Sin hitos aún.</div>}
              {milestones.data && milestones.data.length > 0 && (
                <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {milestones.data.map((m, i) => (
                    <li key={m.id} style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span
                          style={{
                            width: 11,
                            height: 11,
                            borderRadius: '50%',
                            background: 'var(--accent)',
                            marginTop: 5,
                          }}
                        />
                        {i < milestones.data!.length - 1 && (
                          <span style={{ width: 2, flex: 1, background: 'var(--border-strong)', marginTop: 2 }} />
                        )}
                      </div>
                      <div style={{ paddingBottom: 16 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <StatusBadge status={m.status} />
                          <span className="mono muted" style={{ fontSize: 12 }}>
                            {new Date(m.occurredAt).toLocaleString('es')}
                          </span>
                        </div>
                        {m.note && <div style={{ fontSize: 14, marginTop: 4 }}>{m.note}</div>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
