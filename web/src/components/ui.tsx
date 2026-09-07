import type { ReactNode } from 'react';
import type { OperationStatus } from '@/api/types';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 22,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>{title}</h1>
        {subtitle && (
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 15 }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions}
    </header>
  );
}

const STATUS_STYLE: Record<OperationStatus, { cls: string; label: string }> = {
  created: { cls: '', label: 'creada' },
  in_transit: { cls: 'teal', label: 'en tránsito' },
  in_warehouse: { cls: 'accent', label: 'en almacén' },
  delivered: { cls: 'good', label: 'entregada' },
  closed: { cls: 'good', label: 'cerrada' },
};

export function StatusBadge({ status }: { status: OperationStatus }) {
  const s = STATUS_STYLE[status] ?? { cls: '', label: status };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', padding: 24 }}>
      <span className="spinner" /> Cargando…
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="error-box">{message}</div>;
}
