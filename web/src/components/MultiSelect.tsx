import { useEffect, useRef, useState } from 'react';

interface Option {
  key: string;
  count: number;
}

/**
 * Selector múltiple compacto (checkboxes en un popover) — reemplaza a los
 * `st.multiselect` de "Filtros Múltiples" del monitor original (Tipo de
 * Actividad / Estado de Orden / Motivo). Sin librería: solo lo que hace
 * falta para elegir varios valores de una lista con conteos.
 */
export function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function toggle(key: string) {
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => setOpen((v) => !v)}
        style={selected.length > 0 ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
      >
        {label}
        {selected.length > 0 ? ` (${selected.length})` : ''}
      </button>
      {open && (
        <div
          className="card"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            minWidth: 220,
            maxHeight: 280,
            overflowY: 'auto',
            zIndex: 20,
            padding: 8,
          }}
        >
          {options.length === 0 && <div className="muted" style={{ fontSize: 13, padding: 6 }}>Sin opciones.</div>}
          {options.map((o) => (
            <label
              key={o.key}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', fontSize: 13.5, cursor: 'pointer' }}
            >
              <input type="checkbox" checked={selected.includes(o.key)} onChange={() => toggle(o.key)} />
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {o.key.toLowerCase()}
              </span>
              <span className="muted mono" style={{ fontSize: 12 }}>{o.count}</span>
            </label>
          ))}
          {selected.length > 0 && (
            <button type="button" className="btn btn-sm" style={{ width: '100%', marginTop: 6 }} onClick={() => onChange([])}>
              Limpiar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
