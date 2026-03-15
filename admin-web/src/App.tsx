import { useEffect, useState } from 'react';
import { setAuthToken } from './api';
import DashboardPage from './pages/DashboardPage';
import EvacuationAreasPage from './pages/EvacuationAreasPage';
import LoginPage from './pages/LoginPage';
import MonitoringPage from './pages/MonitoringPage';
import AdminPage from './pages/AdminPage';

function App() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token'),
  );
  const [view, setView] = useState<'dashboard' | 'admin' | 'monitoring' | 'evacuation-areas'>('dashboard');

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  function onLoggedIn(nextToken: string) {
    localStorage.setItem('admin_token', nextToken);
    sessionStorage.setItem('admin_token', nextToken);
    setAuthToken(nextToken);
    setToken(nextToken);
  }

  function onLogout() {
    localStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_token');
    setToken(null);
    setView('dashboard');
  }

  if (!token) {
    return <LoginPage onLoggedIn={onLoggedIn} />;
  }

  if (view === 'evacuation-areas') {
    return (
      <EvacuationAreasPage
        onLogout={onLogout}
        onOpenDashboard={() => setView('dashboard')}
        onOpenAdmin={() => setView('admin')}
        onOpenMonitoring={() => setView('monitoring')}
      />
    );
  }

  if (view === 'admin') {
    return (
      <AdminPage
        onLogout={onLogout}
        onOpenDashboard={() => setView('dashboard')}
        onOpenMonitoring={() => setView('monitoring')}
        onOpenEvacuationAreas={() => setView('evacuation-areas')}
        onAuthError={onLogout}
      />
    );
  }

  if (view === 'monitoring') {
    return (
      <MonitoringPage
        onLogout={onLogout}
        onOpenDashboard={() => setView('dashboard')}
        onOpenAdmin={() => setView('admin')}
        onOpenEvacuationAreas={() => setView('evacuation-areas')}
        onAuthError={onLogout}
      />
    );
  }

  return (
    <DashboardPage
      onLogout={onLogout}
      onOpenAdmin={() => setView('admin')}
      onOpenEvacuationAreas={() => setView('evacuation-areas')}
      onOpenMonitoring={() => setView('monitoring')}
      onAuthError={onLogout}
    />
  );
}

export default App;
