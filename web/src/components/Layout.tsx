import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';

const NAV = [
  { to: '/', label: 'Tablero', end: true },
  { to: '/monitor', label: 'Monitor' },
  { to: '/red', label: 'Red (OLT/PON)' },
  { to: '/calidad', label: 'Calidad' },
  { to: '/clients', label: 'Clientes' },
  { to: '/operations', label: 'Operaciones' },
];

export function Layout() {
  const { logout } = useAuth();
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 220,
          flex: '0 0 220px',
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 14px',
        }}
      >
        <div style={{ padding: '0 8px 20px' }}>
          <div
            style={{
              fontFamily: 'Archivo, sans-serif',
              fontWeight: 900,
              fontSize: 20,
              letterSpacing: '-0.02em',
            }}
          >
            Operaciones
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--faint)' }}>
            consola del operador
          </div>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              style={({ isActive }) => ({
                padding: '9px 12px',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                color: isActive ? 'var(--accent)' : 'var(--ink)',
                background: isActive ? 'var(--accent-soft)' : 'transparent',
              })}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <button className="btn btn-sm" style={{ marginTop: 'auto' }} onClick={logout}>
          Cerrar sesión
        </button>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: '28px 32px', maxWidth: 1100 }}>
        <Outlet />
      </main>
    </div>
  );
}
