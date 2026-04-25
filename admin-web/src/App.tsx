import { useEffect, useState } from 'react';
import { setAuthToken, api } from './services/apiClient';
import DashboardPage from './pages/DashboardPage';
import EvacuationAreasPage from './pages/EvacuationAreasPage';
import LoginPage from './pages/LoginPage';
import MonitoringPage from './pages/MonitoringPage';
import RiskPriorityPage from './pages/RiskPriorityPage';
import AdminPage from './pages/AdminPage';
import UsersPage from './pages/UsersPage';
import PostUpdatesPage from './pages/PostUpdatesPage';

function App() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token'),
  );
  const [view, setView] = useState<'dashboard' | 'admin' | 'users' | 'monitoring' | 'risk-priority' | 'evacuation-areas' | 'post-updates'>('dashboard');

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  // Mark admin inactive when the browser tab is closed or the page is unloaded.
  useEffect(() => {
    function handleUnload() {
      const storedToken =
        localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
      if (!storedToken) return;
      const apiBase =
        ((import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000/api').replace(/\/$/, '');
      // sendBeacon can't set Authorization headers, so we pass the token in the body.
      const blob = new Blob(
        [JSON.stringify({ token: storedToken })],
        { type: 'application/json' },
      );
      navigator.sendBeacon(`${apiBase}/auth/logout`, blob);
    }
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  function onLoggedIn(nextToken: string, rememberMe: boolean) {
    if (rememberMe) {
      localStorage.setItem('admin_token', nextToken);
      sessionStorage.removeItem('admin_token');
    } else {
      sessionStorage.setItem('admin_token', nextToken);
      localStorage.removeItem('admin_token');
    }
    setAuthToken(nextToken);
    setToken(nextToken);
  }

  function onLogout() {
    // Mark the admin as inactive on the server before clearing local state.
    api.post('/auth/logout').catch(() => {});
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
        onOpenUsers={() => setView('users')}
        onOpenMonitoring={() => setView('monitoring')}
        onOpenRiskPriority={() => setView('risk-priority')}
        onOpenPostUpdates={() => setView('post-updates')}
      />
    );
  }

  if (view === 'admin') {
    return (
      <AdminPage
        onLogout={onLogout}
        onOpenDashboard={() => setView('dashboard')}
        onOpenUsers={() => setView('users')}
        onOpenMonitoring={() => setView('monitoring')}
        onOpenRiskPriority={() => setView('risk-priority')}
        onOpenEvacuationAreas={() => setView('evacuation-areas')}
        onOpenPostUpdates={() => setView('post-updates')}
        onAuthError={onLogout}
      />
    );
  }

  if (view === 'users') {
    return (
      <UsersPage
        onLogout={onLogout}
        onOpenDashboard={() => setView('dashboard')}
        onOpenAdmin={() => setView('admin')}
        onOpenUsers={() => setView('users')}
        onOpenMonitoring={() => setView('monitoring')}
        onOpenRiskPriority={() => setView('risk-priority')}
        onOpenEvacuationAreas={() => setView('evacuation-areas')}
        onOpenPostUpdates={() => setView('post-updates')}
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
        onOpenUsers={() => setView('users')}
        onOpenRiskPriority={() => setView('risk-priority')}
        onOpenEvacuationAreas={() => setView('evacuation-areas')}
        onOpenPostUpdates={() => setView('post-updates')}
        onAuthError={onLogout}
      />
    );
  }

  if (view === 'risk-priority') {
    return (
      <RiskPriorityPage
        onLogout={onLogout}
        onOpenDashboard={() => setView('dashboard')}
        onOpenAdmin={() => setView('admin')}
        onOpenUsers={() => setView('users')}
        onOpenMonitoring={() => setView('monitoring')}
        onOpenRiskPriority={() => setView('risk-priority')}
        onOpenEvacuationAreas={() => setView('evacuation-areas')}
        onOpenPostUpdates={() => setView('post-updates')}
        onAuthError={onLogout}
      />
    );
  }

  if (view === 'post-updates') {
    return (
      <PostUpdatesPage
        onLogout={onLogout}
        onOpenDashboard={() => setView('dashboard')}
        onOpenAdmin={() => setView('admin')}
        onOpenUsers={() => setView('users')}
        onOpenMonitoring={() => setView('monitoring')}
        onOpenRiskPriority={() => setView('risk-priority')}
        onOpenEvacuationAreas={() => setView('evacuation-areas')}
        onAuthError={onLogout}
      />
    );
  }

  return (
    <DashboardPage
      onLogout={onLogout}
      onOpenAdmin={() => setView('admin')}
      onOpenUsers={() => setView('users')}
      onOpenEvacuationAreas={() => setView('evacuation-areas')}
      onOpenMonitoring={() => setView('monitoring')}
      onOpenRiskPriority={() => setView('risk-priority')}
      onOpenPostUpdates={() => setView('post-updates')}
      onAuthError={onLogout}
    />
  );
}

export default App;
