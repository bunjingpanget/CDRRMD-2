import { useEffect, useMemo, useState } from 'react';
import AdminShell from '../components/AdminShell';
import { d } from '../adminDesign';
import { api } from '../services/apiClient';
import type { EvacuationAreaItem, MonitoringReport } from '../types';
import { computeRiskPriority } from '../utils/riskPriority';

type Props = {
  onLogout: () => void;
  onOpenDashboard: () => void;
  onOpenAdmin: () => void;
  onOpenUsers: () => void;
  onOpenMonitoring: () => void;
  onOpenRiskPriority: () => void;
  onOpenEvacuationAreas: () => void;
  onOpenPostUpdates: () => void;
  onAuthError: () => void;
};

type HazardFeature = {
  properties?: {
    barangay_name?: string;
    flood_risk_level?: string;
  };
};

export default function RiskPriorityPage({
  onLogout,
  onOpenDashboard,
  onOpenAdmin,
  onOpenUsers,
  onOpenMonitoring,
  onOpenRiskPriority,
  onOpenEvacuationAreas,
  onOpenPostUpdates,
  onAuthError,
}: Props) {
  const [areas, setAreas] = useState<EvacuationAreaItem[]>([]);
  const [reports, setReports] = useState<MonitoringReport[]>([]);
  const [hazardFeatures, setHazardFeatures] = useState<HazardFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const [areasResponse, reportsResponse, hazardResponse] = await Promise.all([
        api.get('/content/evacuation-areas'),
        api.get('/reports'),
        api.get('/flood-risk/calamba/barangays'),
      ]);

      setAreas(Array.isArray(areasResponse.data) ? areasResponse.data : []);
      setReports(Array.isArray(reportsResponse.data) ? reportsResponse.data : []);
      setHazardFeatures(Array.isArray(hazardResponse.data?.features) ? hazardResponse.data.features : []);
      setError(null);
    } catch (err: unknown) {
      const apiError = err as { response?: { status?: number; data?: { message?: string } } };
      if (apiError.response?.status === 401) {
        onAuthError();
        return;
      }
      setError(apiError.response?.data?.message || 'Failed to load risk priority data.');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadData(true).catch(() => {});

    const timer = setInterval(() => {
      loadData(false).catch(() => {});
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  const riskRows = useMemo(() => computeRiskPriority(areas, reports, hazardFeatures), [areas, reports, hazardFeatures]);

  const highRisk = riskRows.filter((row) => row.riskLevel === 'HIGH');
  const mediumRisk = riskRows.filter((row) => row.riskLevel === 'MEDIUM');
  const lowRisk = riskRows.filter((row) => row.riskLevel === 'LOW');
  const smartAlerts = riskRows.filter((row) => row.alertMessage);

  const monitoringDropdown = (
    <div className={d.shell.monitoringDropdownPanel}>
      <button
        type="button"
        onClick={onOpenMonitoring}
        className={d.shell.monitoringDropdownButton}
      >
        Layers Show
      </button>
      <button
        type="button"
        className={d.shell.monitoringDropdownButtonActive}
      >
        Risk Priority
      </button>
    </div>
  );

  return (
    <AdminShell
      activeView="risk-priority"
      title="Risk Priority"
      subtitle="Risk computation based on flood hazard, evacuation stress, and active incidents."
      onLogout={onLogout}
      onOpenDashboard={onOpenDashboard}
      onOpenAdmin={onOpenAdmin}
      onOpenUsers={onOpenUsers}
      onOpenMonitoring={onOpenMonitoring}
      onOpenRiskPriority={onOpenRiskPriority}
      onOpenEvacuationAreas={onOpenEvacuationAreas}
      onOpenPostUpdates={onOpenPostUpdates}
      monitoringDropdown={monitoringDropdown}
      actions={<button onClick={onOpenMonitoring} className={d.monitoring.actionEvac}>Back to Monitoring</button>}
    >
      <div className={d.riskPriority.root}>
        {error ? <div className={d.page.error}>{error}</div> : null}

        <section className={d.riskPriority.metricsGrid}>
          <article className={d.riskPriority.metricCard}><p className={d.riskPriority.metricLabel}>High Risk</p><p className={d.riskPriority.metricValue}>{highRisk.length}</p></article>
          <article className={d.riskPriority.metricCard}><p className={d.riskPriority.metricLabel}>Medium Risk</p><p className={d.riskPriority.metricValue}>{mediumRisk.length}</p></article>
          <article className={d.riskPriority.metricCard}><p className={d.riskPriority.metricLabel}>Low Risk</p><p className={d.riskPriority.metricValue}>{lowRisk.length}</p></article>
          <article className={d.riskPriority.metricCard}><p className={d.riskPriority.metricLabel}>Smart Alerts</p><p className={d.riskPriority.metricValue}>{smartAlerts.length}</p></article>
        </section>

        <section className={d.riskPriority.listGrid}>
          <article className={[d.riskPriority.classCardBase, d.riskPriority.classCardHigh].join(' ')}>
            <h3 className={d.riskPriority.classTitle}>High Risk Barangays</h3>
            <div className={d.riskPriority.classList}>
              {highRisk.length === 0 ? <p className={d.riskPriority.empty}>No barangays are currently high risk.</p> : highRisk.map((row) => (
                <div key={row.barangayKey} className={d.riskPriority.classItem}>
                  <p className={d.riskPriority.classItemName}>{row.barangayName}</p>
                  <p className={d.riskPriority.classMeta}>Score: {row.riskScore.toFixed(2)} | Hazard: {row.floodHazardLabel} | Usage: {row.evacuationUsagePct.toFixed(1)}% | Active Incidents: {row.activeIncidentCount}</p>
                </div>
              ))}
            </div>
          </article>

          <article className={[d.riskPriority.classCardBase, d.riskPriority.classCardMedium].join(' ')}>
            <h3 className={d.riskPriority.classTitle}>Moderate Risk Barangays</h3>
            <div className={d.riskPriority.classList}>
              {mediumRisk.length === 0 ? <p className={d.riskPriority.empty}>No barangays are currently moderate risk.</p> : mediumRisk.map((row) => (
                <div key={row.barangayKey} className={d.riskPriority.classItem}>
                  <p className={d.riskPriority.classItemName}>{row.barangayName}</p>
                  <p className={d.riskPriority.classMeta}>Score: {row.riskScore.toFixed(2)} | Hazard: {row.floodHazardLabel} | Usage: {row.evacuationUsagePct.toFixed(1)}% | Active Incidents: {row.activeIncidentCount}</p>
                </div>
              ))}
            </div>
          </article>

          <article className={[d.riskPriority.classCardBase, d.riskPriority.classCardLow].join(' ')}>
            <h3 className={d.riskPriority.classTitle}>Low Risk Barangays</h3>
            <div className={d.riskPriority.classList}>
              {lowRisk.length === 0 ? <p className={d.riskPriority.empty}>No barangays are currently low risk.</p> : lowRisk.map((row) => (
                <div key={row.barangayKey} className={d.riskPriority.classItem}>
                  <p className={d.riskPriority.classItemName}>{row.barangayName}</p>
                  <p className={d.riskPriority.classMeta}>Score: {row.riskScore.toFixed(2)} | Hazard: {row.floodHazardLabel} | Usage: {row.evacuationUsagePct.toFixed(1)}% | Active Incidents: {row.activeIncidentCount}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className={d.riskPriority.alertsCard}>
          <h3 className={d.riskPriority.alertsTitle}>Smart Dashboard Alerts</h3>
          <div className={d.riskPriority.alertsList}>
            {smartAlerts.length === 0 ? <p className={d.riskPriority.empty}>No high-risk alerts triggered right now.</p> : smartAlerts.map((row) => (
              <p key={row.barangayKey} className={d.riskPriority.alertItem}>{row.alertMessage}</p>
            ))}
          </div>
        </section>

        {loading ? <p className={d.page.loading}>Loading risk priority data...</p> : null}
      </div>
    </AdminShell>
  );
}
