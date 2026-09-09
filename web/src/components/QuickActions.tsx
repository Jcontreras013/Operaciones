import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { CreateManualWorkOrderInput, RegistrarAlmuerzoInput, WorkOrder } from '@/api/types';
import { ErrorBox } from '@/components/ui';

/**
 * Debe coincidir con ACTIVIDADES_PERMITIDAS en src/modules/field/reportes.ts
 * — es la misma lista, la única fuente de verdad vive en el backend y se
 * valida ahí; esta copia es solo para poblar el <select>.
 */
const ACTIVIDADES_PERMITIDAS = [
  'CEQUI', 'INSEQUIPO', 'INSFIBRA', 'INSFIBRACORP', 'INSHFC', 'INS-WA',
  'PEXTERNO', 'PLEXISCA', 'SOP', 'SOPCORP', 'SOPFIBRA', 'SOPFIBRACORP',
  'SOPRECONCORP', 'SOPRECONFIBRA', 'SOPRECONHFC', 'SPLITTEROPT',
  'TRASLADOEXTFIBRA', 'TRASLADOEXTFIBRACORP', 'TRASLADOINTERNOFIBRA',
  'TRASLADOINTFIBRACORP', 'TVADICIONAL',
];

/** 'YYYY-MM-DD' de hoy en hora de Honduras. */
function hoyHN(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' });
}

/**
 * "Ingresar Orden Manual" + "Registrar Almuerzo" del monitor original: solo
 * para cuando la API de Cepheus falla y una orden real no se refleja, o para
 * anotar la ventana de almuerzo de un técnico. Solo Admin/Jefe (el backend
 * lo exige igual; esto solo evita mostrar un formulario que daría 403).
 */
export function QuickActions({ onOrdenGuardada }: { onOrdenGuardada: () => void }) {
  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginBottom: 24 }}>
      <OrdenManualPanel onGuardada={onOrdenGuardada} />
      <AlmuerzoPanel onGuardado={onOrdenGuardada} />
    </div>
  );
}

function OrdenManualPanel({ onGuardada }: { onGuardada: () => void }) {
  const qc = useQueryClient();
  const [numOrden, setNumOrden] = useState('');
  const [actividad, setActividad] = useState(ACTIVIDADES_PERMITIDAS[0]);
  const [tecnico, setTecnico] = useState('');
  const [fecha, setFecha] = useState(hoyHN());
  const [horaInicio, setHoraInicio] = useState('');
  const [horaLiq, setHoraLiq] = useState('');

  const manuales = useQuery({
    queryKey: ['field-ordenes-manuales'],
    queryFn: () => api<WorkOrder[]>('/v1/field/work-orders/manual'),
  });

  const guardar = useMutation({
    mutationFn: (input: CreateManualWorkOrderInput) =>
      api<WorkOrder>('/v1/field/work-orders/manual', { method: 'POST', body: input }),
    onSuccess: () => {
      setNumOrden('');
      setTecnico('');
      setHoraInicio('');
      setHoraLiq('');
      qc.invalidateQueries({ queryKey: ['field-ordenes-manuales'] });
      onGuardada();
    },
  });

  const borrar = useMutation({
    mutationFn: (externalNum: string) => api(`/v1/field/work-orders/manual/${externalNum}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['field-ordenes-manuales'] });
      onGuardada();
    },
  });

  return (
    <details className="card card-pad">
      <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 14.5 }}>📝 Ingresar Orden Manual</summary>
      <p className="muted" style={{ fontSize: 12.5, margin: '8px 0 12px' }}>
        Úsalo cuando la API falle y una orden real de un técnico no aparezca en el monitor.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          guardar.mutate({ numOrden, actividad, tecnico, fecha, horaInicio, horaLiq: horaLiq || undefined });
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <input className="input" placeholder="Número de orden" value={numOrden} onChange={(e) => setNumOrden(e.target.value)} required />
        <select className="input" value={actividad} onChange={(e) => setActividad(e.target.value)}>
          {ACTIVIDADES_PERMITIDAS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <input className="input" placeholder="Técnico (nombre exacto)" value={tecnico} onChange={(e) => setTecnico(e.target.value)} required />
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          <input className="input" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} required title="Hora inicio" />
          <input className="input" type="time" value={horaLiq} onChange={(e) => setHoraLiq(e.target.value)} title="Hora liquidada (opcional)" />
        </div>
        {guardar.error && <ErrorBox message={(guardar.error as Error).message} />}
        <button className="btn btn-primary" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : '💾 Guardar Orden Manual'}
        </button>
      </form>

      {manuales.data && manuales.data.length > 0 && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>Órdenes manuales guardadas:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {manuales.data.map((o) => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span className="mono">{o.externalNum}</span>
                <span className="muted">{o.actividad} · {o.tecnico}</span>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={borrar.isPending}
                  onClick={() => borrar.mutate(o.externalNum)}
                >
                  🗑️ Borrar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </details>
  );
}

function AlmuerzoPanel({ onGuardado }: { onGuardado: () => void }) {
  const [tecnico, setTecnico] = useState('');
  const [fecha, setFecha] = useState(hoyHN());
  const [horaInicio, setHoraInicio] = useState('12:00');
  const [horaFin, setHoraFin] = useState('13:00');

  const guardar = useMutation({
    mutationFn: (input: RegistrarAlmuerzoInput) => api('/v1/field/almuerzos', { method: 'POST', body: input }),
    onSuccess: () => {
      setTecnico('');
      onGuardado();
    },
  });

  return (
    <details className="card card-pad">
      <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 14.5 }}>🍽️ Registrar Almuerzo</summary>
      <p className="muted" style={{ fontSize: 12.5, margin: '8px 0 12px' }}>
        Ingresa la hora de almuerzo de un técnico para que se vea aparte en el Gantt.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          guardar.mutate({ tecnico, fecha, horaInicio, horaFin });
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <input className="input" placeholder="Técnico (nombre exacto)" value={tecnico} onChange={(e) => setTecnico(e.target.value)} required />
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          <input className="input" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} required title="Hora inicio" />
          <input className="input" type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} required title="Hora fin" />
        </div>
        {guardar.error && <ErrorBox message={(guardar.error as Error).message} />}
        {guardar.isSuccess && <div className="muted" style={{ fontSize: 12.5 }}>✅ Almuerzo guardado.</div>}
        <button className="btn btn-primary" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : '💾 Guardar Almuerzo'}
        </button>
      </form>
    </details>
  );
}
