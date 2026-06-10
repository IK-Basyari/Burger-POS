import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PortalLogin from './pages/PortalLogin';
import PosLogin from './pages/PosLogin';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import PosDashboard from './pages/PosDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import AccountPending from './pages/AccountPending';
import RegisterToko from './pages/RegisterToko';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/pos-login" replace />} />
        <Route path="/portal-login" element={<PortalLogin />} />
        <Route path="/pos-login" element={<PosLogin />} />
        <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
        <Route path="/owner/dashboard" element={<OwnerDashboard />} />
        <Route path="/pos/dashboard" element={<PosDashboard />} />
        <Route path="/account-pending" element={<AccountPending />} />
        <Route path="/register-toko" element={<RegisterToko />} />
      </Routes>
    </BrowserRouter>
  );
}
