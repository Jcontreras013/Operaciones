import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiDownload, apiUpload } from '@/api/client';
import type { PersonnelDocument } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { ErrorBox, Loading, PageHeader } from '@/components/ui';

/**
 * Repositorio de Documentos ("Expedientes" del monitor original), sin la
 * clasificación disciplinaria automática ni la generación de PDF/DOCX de
 * incidencias. El acceso es por persona exacta (jaison/oscar/afajardo), no
 * por rol — el backend lo exige igual (PersonnelRepoGuard); acá solo se
 * evita mostrar la pantalla a quien de todos modos recibiría 403.
 */
const USUARIOS_AUTORIZADOS = new Set(['jaison', 'oscar', 'afajardo']);

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ExpedientesPage() {
  const { email } = useAuth();
  const autorizado = Boolean(email && USUARIOS_AUTORIZADOS.has(email.trim().toLowerCase()));

  if (!autorizado) {
    return (
      <div>
        <PageHeader title="Expedientes" subtitle="Repositorio de documentos de personal" />
        <div className="card card-pad">
          <p>🔒 No tienes acceso a este repositorio. Contiene documentos laborales sensibles y solo lo pueden ver personas puntuales, no un rol completo.</p>
        </div>
      </div>
    );
  }

  return <RepositorioDocumentos />;
}

function RepositorioDocumentos() {
  const qc = useQueryClient();
  const [modoNombre, setModoNombre] = useState<'lista' | 'nuevo'>('lista');
  const [colaboradorSel, setColaboradorSel] = useState('');
  const [colaboradorTxt, setColaboradorTxt] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [colaboradorVer, setColaboradorVer] = useState('');

  const colaboradores = useQuery({
    queryKey: ['personnel-colaboradores'],
    queryFn: () => api<string[]>('/v1/personnel/colaboradores'),
  });

  const colaborador = (modoNombre === 'lista' ? colaboradorSel : colaboradorTxt).trim();

  const documentos = useQuery({
    queryKey: ['personnel-documentos', colaboradorVer],
    queryFn: () => api<PersonnelDocument[]>(`/v1/personnel/documentos?colaborador=${encodeURIComponent(colaboradorVer)}`),
    enabled: Boolean(colaboradorVer),
  });

  const subir = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Selecciona al menos un archivo');
      const form = new FormData();
      form.append('colaborador', colaborador);
      if (descripcion.trim()) form.append('descripcion', descripcion.trim());
      form.append('file', file);
      return apiUpload('/v1/personnel/documentos', form);
    },
    onSuccess: () => {
      setDescripcion('');
      setFile(null);
      qc.invalidateQueries({ queryKey: ['personnel-colaboradores'] });
      if (colaboradorVer === colaborador.toUpperCase()) {
        qc.invalidateQueries({ queryKey: ['personnel-documentos', colaboradorVer] });
      }
    },
  });

  const borrar = useMutation({
    mutationFn: (id: string) => api(`/v1/personnel/documentos/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personnel-documentos', colaboradorVer] }),
  });

  return (
    <div>
      <PageHeader
        title="🗄️ Repositorio de Documentos"
        subtitle="Documentos laborales por colaborador — privados, solo accesibles desde aquí (a diferencia del monitor original, no quedan con enlaces públicos)."
      />

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', marginBottom: 24 }}>
        <div className="card card-pad">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📤 Subir Documento</h3>

          <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 13 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <input type="radio" checked={modoNombre === 'lista'} onChange={() => setModoNombre('lista')} />
              Seleccionar de la lista
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <input type="radio" checked={modoNombre === 'nuevo'} onChange={() => setModoNombre('nuevo')} />
              Escribir uno nuevo
            </label>
          </div>

          {modoNombre === 'lista' ? (
            <select className="input" style={{ marginBottom: 10 }} value={colaboradorSel} onChange={(e) => setColaboradorSel(e.target.value)}>
              <option value="">— Elegir colaborador —</option>
              {colaboradores.data?.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          ) : (
            <input
              className="input"
              style={{ marginBottom: 10 }}
              placeholder="Ej: JUAN PEREZ"
              value={colaboradorTxt}
              onChange={(e) => setColaboradorTxt(e.target.value)}
            />
          )}

          <input
            className="input"
            style={{ marginBottom: 10 }}
            placeholder="Descripción (opcional) — ej: Contrato firmado 2026"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />

          <input
            className="input"
            style={{ marginBottom: 10 }}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.png,.jpg,.jpeg"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          {subir.error && <ErrorBox message={(subir.error as Error).message} />}

          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={subir.isPending || !colaborador || !file}
            onClick={() => subir.mutate()}
          >
            {subir.isPending ? 'Subiendo…' : '☁️ Subir al Repositorio'}
          </button>
        </div>

        <div className="card card-pad">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📂 Explorar Carpetas</h3>
          {colaboradores.isLoading && <Loading />}
          <select
            className="input"
            value={colaboradorVer}
            onChange={(e) => setColaboradorVer(e.target.value)}
          >
            <option value="">— Elegir colaborador —</option>
            {colaboradores.data?.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {documentos.isLoading && <Loading />}
          {colaboradorVer && documentos.data && documentos.data.length === 0 && (
            <div className="empty" style={{ marginTop: 12 }}>Sin documentos guardados para este colaborador.</div>
          )}
          {documentos.data && documentos.data.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {documentos.data.map((d) => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 13, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nombreArchivo}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>
                      {formatBytes(d.tamanoBytes)} · {new Date(d.createdAt).toLocaleDateString('es')}
                      {d.descripcion ? ` · ${d.descripcion}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-sm" onClick={() => apiDownload(`/v1/personnel/documentos/${d.id}/descargar`, d.nombreArchivo)}>
                      ⬇️
                    </button>
                    <button className="btn btn-sm" disabled={borrar.isPending} onClick={() => borrar.mutate(d.id)}>
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
