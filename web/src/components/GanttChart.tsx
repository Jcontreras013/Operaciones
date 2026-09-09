import type { GanttRow } from '@/api/types';

const HORAS_EJE = [0, 3, 6, 9, 12, 15, 18, 21, 24];

/** ms epoch de medianoche Honduras (UTC-6) para 'YYYY-MM-DD'. */
function inicioDiaHNms(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d) + 6 * 60 * 60 * 1000;
}

/** Mismo esquema que colores_solidos del monitor original — un color fijo por tipo de actividad. */
const COLOR_POR_ACTIVIDAD: Record<string, string> = {
  SOPFIBRA: '#d32f2f',
  SOPFIBRACORP: '#880e4f',
  SOPCORP: '#ad1457',
  SOP: '#d32f2f',
  INSFIBRA: '#1976d2',
  INSFIBRACORP: '#0d47a1',
  INSEQUIPO: '#1565c0',
  INSHFC: '#1565c0',
  PEXTERNO: '#f57c00',
  PLEXISCA: '#e65100',
  SPLITTEROPT: '#ef6c00',
  TRASLADOEXTFIBRA: '#8e24aa',
  TRASLADOEXTFIBRACORP: '#8e24aa',
  TRASLADOINTERNOFIBRA: '#7b1fa2',
  TRASLADOINTFIBRACORP: '#7b1fa2',
  SOPRECONCORP: '#c2185b',
  SOPRECONHFC: '#c2185b',
  SOPRECONFIBRA: '#c2185b',
  TVADICIONAL: '#00897b',
  ALMUERZO: '#78909c',
};

function actividadColor(actividad: string | null): string {
  const a = (actividad ?? '').toUpperCase();
  return COLOR_POR_ACTIVIDAD[a] ?? 'var(--faint)';
}

/** Línea de tiempo por técnico (reemplaza el Gantt de app.py). Eje: 24h del día pedido, hora de Honduras. */
export function GanttChart({ date, rows }: { date: string; rows: GanttRow[] }) {
  if (rows.length === 0) {
    return <div className="empty">Sin órdenes trabajadas ese día.</div>;
  }

  const inicioDiaMs = inicioDiaHNms(date);
  const porTecnico = new Map<string, GanttRow[]>();
  for (const r of rows) {
    const lista = porTecnico.get(r.tecnico) ?? [];
    lista.push(r);
    porTecnico.set(r.tecnico, lista);
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 720 }}>
        {/* Eje de horas */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', marginBottom: 6 }}>
          <div />
          <div style={{ position: 'relative', height: 18 }}>
            {HORAS_EJE.map((h) => (
              <span
                key={h}
                className="mono muted"
                style={{ position: 'absolute', left: `${(h / 24) * 100}%`, fontSize: 11, transform: h === 24 ? 'translateX(-100%)' : undefined }}
              >
                {String(h).padStart(2, '0')}:00
              </span>
            ))}
          </div>
        </div>

        {[...porTecnico.entries()].map(([tecnico, ordenes]) => (
          <div key={tecnico} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, paddingRight: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tecnico}
            </div>
            <div
              style={{
                position: 'relative',
                height: 26,
                background: 'var(--surface-2)',
                borderRadius: 5,
              }}
            >
              {HORAS_EJE.slice(1, -1).map((h) => (
                <div
                  key={h}
                  style={{ position: 'absolute', left: `${(h / 24) * 100}%`, top: 0, bottom: 0, width: 1, background: 'var(--border)' }}
                />
              ))}
              {ordenes.map((o, i) => {
                const leftH = (new Date(o.inicio).getTime() - inicioDiaMs) / 3_600_000;
                const widthH = Math.max((new Date(o.fin).getTime() - new Date(o.inicio).getTime()) / 3_600_000, 0.1);
                return (
                  <div
                    key={`${o.externalNum}-${i}`}
                    title={`${o.actividad === 'ALMUERZO' ? 'Almuerzo' : o.externalNum} · ${o.actividad ?? '—'}${o.cliente ? ` · ${o.cliente}` : ''}${o.estado ? ` · ${o.estado.toLowerCase()}` : ''}\n${new Date(o.inicio).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Tegucigalpa' })}–${new Date(o.fin).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Tegucigalpa' })}`}
                    style={{
                      position: 'absolute',
                      left: `${(leftH / 24) * 100}%`,
                      width: `${(widthH / 24) * 100}%`,
                      top: 3,
                      bottom: 3,
                      background: actividadColor(o.actividad),
                      borderRadius: 4,
                      minWidth: 3,
                      cursor: 'default',
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 12 }}>
        {[...new Set(rows.map((r) => (r.actividad ?? '').toUpperCase()).filter(Boolean))].sort().map((a) => (
          <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: actividadColor(a), display: 'inline-block' }} />
            <span className="muted">{a}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
