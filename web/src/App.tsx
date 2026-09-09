import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Layout } from '@/components/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { MonitorPage } from '@/pages/MonitorPage';
import { OfflinePage } from '@/pages/OfflinePage';
import { ReportesPage } from '@/pages/ReportesPage';
import { QualityPage } from '@/pages/QualityPage';
import { ClientsPage } from '@/pages/ClientsPage';
import { OperationsPage } from '@/pages/OperationsPage';
import { OperationDetailPage } from '@/pages/OperationDetailPage';

export function App() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/monitor" element={<MonitorPage />} />
        <Route path="/red" element={<OfflinePage />} />
        <Route path="/reportes" element={<ReportesPage />} />
        <Route path="/calidad" element={<QualityPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/operations" element={<OperationsPage />} />
        <Route path="/operations/:id" element={<OperationDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
