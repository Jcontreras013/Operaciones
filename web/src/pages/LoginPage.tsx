import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { ApiError } from '@/api/client';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ tenantSlug, email, password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Credenciales inválidas'
          : 'No se pudo iniciar sesión. Reintenta.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 20 }}>
      <div className="card card-pad" style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ marginBottom: 20 }}>
          <div
            style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: 24, letterSpacing: '-0.02em' }}
          >
            Operaciones
          </div>
          <div className="mono" style={{ fontSize: 12, color: 'var(--faint)' }}>
            consola del operador
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <label className="field">
            <span>Operador (slug)</span>
            <input
              className="input"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              placeholder="andina"
              autoComplete="organization"
              required
            />
          </label>
          <label className="field">
            <span>Usuario</span>
            <input
              className="input"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jaison"
              autoComplete="username"
              required
            />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <div className="error-box" style={{ marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
