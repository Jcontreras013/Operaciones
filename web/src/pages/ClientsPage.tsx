import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Client } from '@/api/types';
import { ErrorBox, Loading, PageHeader } from '@/components/ui';

export function ClientsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const clients = useQuery({ queryKey: ['clients'], queryFn: () => api<Client[]>('/v1/clients') });

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const create = useMutation({
    mutationFn: () =>
      api<Client>('/v1/clients', {
        method: 'POST',
        body: {
          name,
          code: code || undefined,
          contactEmail: contactEmail || undefined,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      setName('');
      setCode('');
      setContactEmail('');
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
        title="Clientes"
        subtitle="Los dueños de la carga que el operador atiende"
        actions={
          <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancelar' : 'Nuevo cliente'}
          </button>
        }
      />

      {showForm && (
        <form className="card card-pad" style={{ marginBottom: 20 }} onSubmit={onSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Nombre *</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Código</span>
              <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="IMPSUR" />
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Email de contacto</span>
              <input
                className="input"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </label>
          </div>
          {create.error && (
            <div style={{ marginTop: 14 }}>
              <ErrorBox message={(create.error as Error).message} />
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary" disabled={create.isPending}>
              {create.isPending ? 'Guardando…' : 'Crear cliente'}
            </button>
          </div>
        </form>
      )}

      <div className="card">
        {clients.isLoading && <Loading />}
        {clients.error && (
          <div style={{ padding: 20 }}>
            <ErrorBox message={(clients.error as Error).message} />
          </div>
        )}
        {clients.data && clients.data.length === 0 && <div className="empty">Aún no hay clientes.</div>}
        {clients.data && clients.data.length > 0 && (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Código</th>
                  <th>Contacto</th>
                </tr>
              </thead>
              <tbody>
                {clients.data.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td className="mono muted">{c.code ?? '—'}</td>
                    <td className="muted">{c.contactEmail ?? '—'}</td>
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
