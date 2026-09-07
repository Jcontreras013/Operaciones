import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Client, Operation } from '@/api/types';
import { ErrorBox, Loading, PageHeader, StatusBadge } from '@/components/ui';

const SERVICE_TYPES = ['freight', 'warehousing', 'last_mile', 'customs', 'other'];

export function OperationsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const operations = useQuery({
    queryKey: ['operations'],
    queryFn: () => api<Operation[]>('/v1/operations'),
  });
  const clients = useQuery({ queryKey: ['clients'], queryFn: () => api<Client[]>('/v1/clients') });
  const clientName = (id: string) => clients.data?.find((c) => c.id === id)?.name ?? id.slice(0, 8);

  const [clientId, setClientId] = useState('');
  const [reference, setReference] = useState('');
  const [serviceType, setServiceType] = useState('freight');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  const create = useMutation({
    mutationFn: () =>
      api<Operation>('/v1/operations', {
        method: 'POST',
        body: { clientId, reference, serviceType, origin: origin || undefined, destination: destination || undefined },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations'] });
      setReference('');
      setOrigin('');
      setDestination('');
      setShowForm(false);
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  return (
    <div>
      <PageHeader
        title="Operaciones"
        subtitle="El registro único de cada operación logística"
        actions={
          <button
            className="btn btn-primary"
            onClick={() => setShowForm((s) => !s)}
            disabled={!clients.data || clients.data.length === 0}
          >
            {showForm ? 'Cancelar' : 'Nueva operación'}
          </button>
        }
      />

      {clients.data && clients.data.length === 0 && (
        <div style={{ marginBottom: 20 }}>
          <ErrorBox message="Primero crea un cliente para poder registrar operaciones." />
        </div>
      )}

      {showForm && clients.data && (
        <form className="card card-pad" style={{ marginBottom: 20 }} onSubmit={onSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Cliente *</span>
              <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                <option value="" disabled>
                  Elegir…
                </option>
                {clients.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Referencia *</span>
              <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} required placeholder="OP-2026-0001" />
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Servicio</span>
              <select className="select" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                {SERVICE_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Origen</span>
              <input className="input" value={origin} onChange={(e) => setOrigin(e.target.value)} />
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Destino</span>
              <input className="input" value={destination} onChange={(e) => setDestination(e.target.value)} />
            </label>
          </div>
          {create.error && (
            <div style={{ marginTop: 14 }}>
              <ErrorBox message={(create.error as Error).message} />
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary" disabled={create.isPending || !clientId}>
              {create.isPending ? 'Creando…' : 'Crear operación'}
            </button>
          </div>
        </form>
      )}

      <div className="card">
        {operations.isLoading && <Loading />}
        {operations.error && (
          <div style={{ padding: 20 }}>
            <ErrorBox message={(operations.error as Error).message} />
          </div>
        )}
        {operations.data && operations.data.length === 0 && <div className="empty">Aún no hay operaciones.</div>}
        {operations.data && operations.data.length > 0 && (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Referencia</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th>Origen → Destino</th>
                </tr>
              </thead>
              <tbody>
                {operations.data.map((op) => (
                  <tr key={op.id}>
                    <td>
                      <Link to={`/operations/${op.id}`} style={{ fontWeight: 600 }}>
                        {op.reference}
                      </Link>
                    </td>
                    <td className="muted">{clientName(op.clientId)}</td>
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
      </div>
    </div>
  );
}
