import type { GanttRow } from '@/api/types';

const HORAS_EJE = [0, 3, 6, 9, 12, 15, 18, 21, 24];

/** ms epoch de medianoche Honduras (UTC-6) para 'YYYY-MM-DD'. */
function inicioDiaHNms(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d) + 6 * 60 * 60 * 1000;
}

function estadoColor(estado: string | null): string {
  const e = (estado ?? '').toUpperCase();
  if (e === 'CERRADA' || e === 'INSTALADA') return 'var(--good)';
  if (e === 'NOINSTALADO' || e === 'CANCELADA') return 'var(--bad)';
  if (e === 'ASIGNADA' || e === 'EN PROCESO') return 'var(--teal)';
  if (e === 'REPROGRAMADA' || e === 'PENDIENTE') return 'var(--warn)';
  return 'var(--faint)';
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
                    title={`${o.externalNum} · ${o.actividad ?? '—'} · ${o.cliente ?? '—'} · ${(o.estado ?? '—').toLowerCase()}\n${new Date(o.inicio).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Tegucigalpa' })}–${new Date(o.fin).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Tegucigalpa' })}`}
                    style={{
                      position: 'absolute',
                      left: `${(leftH / 24) * 100}%`,
                      width: `${(widthH / 24) * 100}%`,
                      top: 3,
                      bottom: 3,
                      background: estadoColor(o.estado),
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
    </div>
  );
}
