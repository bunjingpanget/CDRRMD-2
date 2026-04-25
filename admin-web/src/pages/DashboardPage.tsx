import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/apiClient';
import AdminShell from '../components/AdminShell';
import { d } from '../adminDesign';
import type {
  DashboardIncident,
  DashboardSummary,
  EvacuationAreaItem,
} from '../types';
import { buildCalambaMapHtml } from '../utils/calambaMapHtml';
import { computeRiskPriority } from '../utils/riskPriority';

type HazardFeature = {
  properties?: {
    barangay_name?: string;
    flood_risk_level?: string;
  };
};

type RainRankingItem = {
  barangayName: string;
  rainIntensityMmPerHour: number;
  rainLevel: 'Light' | 'Moderate' | 'Heavy' | 'Severe';
};

const MIN_ACTIVE_RAIN_MM_PER_HOUR = 0.1;

function normalizeBarangayKey(value?: string | null) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

type Props = {
  onLogout: () => void;
  onOpenAdmin: () => void;
  onOpenUsers: () => void;
  onOpenEvacuationAreas: () => void;
  onOpenMonitoring: () => void;
  onOpenRiskPriority: () => void;
  onOpenPostUpdates: () => void;
  onAuthError: () => void;
};

function titleCase(value: string) {
  if (!value) {
    return '-';
  }
  return value
    .toLowerCase()
    .split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function buildMapHtml(
  areas: EvacuationAreaItem[],
  incidents: DashboardIncident[],
  barangayBoundaryGeoJsonUrl: string,
  rainImpactUrl: string,
) {
  return buildCalambaMapHtml(
    areas,
    null,
    [],
    null,
    null,
    incidents
      .map((item) => ({
        reportCode: item.caseId || 'Incident',
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
        status: String(item.status || 'pending'),
        reportType: String(item.type || 'incident'),
      }))
      .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)),
    barangayBoundaryGeoJsonUrl,
    '',
    rainImpactUrl,
    {
      boundary: true,
      floodHazard: true,
      evacuationAreas: true,
      incidentMarkers: true,
      responderRoute: true,
      weatherOverlay: false,
    },
  );
}

export default function DashboardPage({ onLogout, onOpenAdmin, onOpenUsers, onOpenEvacuationAreas, onOpenMonitoring, onOpenRiskPriority, onOpenPostUpdates, onAuthError }: Props) {
  const [areas, setAreas] = useState<EvacuationAreaItem[]>([]);
  const [incidents, setIncidents] = useState<DashboardIncident[]>([]);
  const [hazardFeatures, setHazardFeatures] = useState<HazardFeature[]>([]);
  const [cards, setCards] = useState<DashboardSummary['cards']>({
    emergencyAlerts: 0,
    activeTeams: 0,
    evacuationAreas: 0,
    totalEvacuees: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topRainBarangays, setTopRainBarangays] = useState<RainRankingItem[]>([]);
  const [rainLegendUpdatedAt, setRainLegendUpdatedAt] = useState<string | null>(null);
  const [selectedRiskBarangayKey, setSelectedRiskBarangayKey] = useState<string | null>(null);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const mapFrameRef = useRef<HTMLIFrameElement | null>(null);

  async function loadFeed(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      const [areasResponse, summaryResponse, hazardResponse] = await Promise.all([
        api.get('/content/evacuation-areas'),
        api.get('/content/dashboard-summary'),
        api.get('/flood-risk/calamba/barangays'),
      ]);

      setAreas(areasResponse.data);
      setCards(summaryResponse.data.cards);
      setIncidents(summaryResponse.data.incidents);
      setHazardFeatures(Array.isArray(hazardResponse.data?.features) ? hazardResponse.data.features : []);
    } catch (err: unknown) {
      const apiError = err as { response?: { status?: number; data?: { message?: string } } };
      if (apiError.response?.status === 401) {
        onAuthError();
        return;
      }
      setError(apiError.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  async function loadRainRanking() {
    try {
      const rainImpactResponse = await api.get('/flood-risk/calamba/rain-impact').catch(() => ({ data: null }));
      const rainPayload = rainImpactResponse?.data as {
        updatedAt?: string;
        barangayImpacts?: Array<{
          barangayName?: string;
          rainIntensityMmPerHour?: number;
          rainLevel?: string;
        }>;
      } | null;

      const impacts = Array.isArray(rainPayload?.barangayImpacts) ? rainPayload.barangayImpacts : [];

      const ranked = impacts
        .map((item) => {
          const rain = Number(item?.rainIntensityMmPerHour || 0);
          const normalizedLevel = String(item?.rainLevel || 'Light');
          const level = (normalizedLevel === 'Severe' || normalizedLevel === 'Heavy' || normalizedLevel === 'Moderate')
            ? normalizedLevel
            : 'Light';

          return {
            barangayName: String(item?.barangayName || 'Barangay'),
            rainIntensityMmPerHour: Number.isFinite(rain) ? rain : 0,
            rainLevel: level as RainRankingItem['rainLevel'],
          };
        })
        .filter((item) => item.rainIntensityMmPerHour > 2.5) // Moderate and above only (>2.5 mm/hr)
        .sort((a, b) => b.rainIntensityMmPerHour - a.rainIntensityMmPerHour);

      setTopRainBarangays(ranked);
      setRainLegendUpdatedAt(rainPayload?.updatedAt || new Date().toISOString());
    } catch {
      // Keep existing ranking if rain feed is temporarily unavailable.
    }
  }

  useEffect(() => {
    loadFeed(true);
    loadRainRanking().catch(() => {});

    const refreshTimer = setInterval(() => {
      loadFeed(false);
    }, 7000);

    const rainTimer = setInterval(() => {
      loadRainRanking().catch(() => {});
    }, 10000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadFeed(false);
        loadRainRanking().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(refreshTimer);
      clearInterval(rainTimer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const mapHtml = useMemo(
    () => buildMapHtml(
      areas,
      incidents,
      `${String(api.defaults.baseURL || 'http://localhost:4000/api').replace(/\/$/, '')}/flood-risk/calamba/barangays`,
      `${String(api.defaults.baseURL || 'http://localhost:4000/api').replace(/\/$/, '')}/flood-risk/calamba/rain-impact`,
    ),
    [areas, incidents],
  );

  const statusRows = useMemo(
    () =>
      areas.map((area) => ({
        ...area,
        occupancyLabel: `${area.evacuees}/${area.capacity}`,
        occupancyStatus:
          area.evacuation_status === 'full'
            ? 'Full'
            : area.evacuation_status === 'nearly_full'
              ? 'Nearly Full'
              : 'Available',
      })),
    [areas],
  );

  const cardsToRender = [
    {
      key: 'emergencyAlerts',
      label: 'Emergency Alerts',
      value: cards.emergencyAlerts,
      className: d.dashboard.cardEmergency,
    },
    {
      key: 'activeTeams',
      label: 'Active Teams',
      value: cards.activeTeams,
      className: d.dashboard.cardTeams,
    },
    {
      key: 'evacuationAreas',
      label: 'Evacuation Areas',
      value: cards.evacuationAreas,
      className: d.dashboard.cardEvac,
    },
    {
      key: 'totalEvacuees',
      label: 'Total Evacuees',
      value: cards.totalEvacuees,
      className: d.dashboard.cardEvacuees,
    },
  ];

  const riskRows = useMemo(
    () => computeRiskPriority(areas, incidents.map((item) => ({
      location: item.location,
      status: item.status,
      evacuation_area_name: null,
    })), hazardFeatures),
    [areas, incidents, hazardFeatures],
  );

  const highRiskBarangays = riskRows.filter((row) => row.riskLevel === 'HIGH');
  const mediumRiskBarangays = riskRows.filter((row) => row.riskLevel === 'MEDIUM');
  const lowRiskBarangays = riskRows.filter((row) => row.riskLevel === 'LOW');
  const smartAlerts = riskRows.filter((row) => row.alertMessage);

  function focusBarangayOnMap(barangayName: string, riskLevel: 'HIGH' | 'MEDIUM' | 'LOW') {
    const key = normalizeBarangayKey(barangayName);
    setSelectedRiskBarangayKey(key || null);

    const iframeWindow = mapFrameRef.current?.contentWindow;
    if (!iframeWindow || !key) {
      return;
    }

    iframeWindow.postMessage(
      {
        type: 'dashboard-focus-barangay',
        barangayKey: key,
        riskLevel,
      },
      '*',
    );
  }

  return (
    <AdminShell
      activeView="dashboard"
      title="Operations Dashboard"
      noMainScroll
      onLogout={onLogout}
      onOpenDashboard={() => {}}
      onOpenAdmin={onOpenAdmin}
      onOpenUsers={onOpenUsers}
      onOpenMonitoring={onOpenMonitoring}
      onOpenRiskPriority={onOpenRiskPriority}
      onOpenEvacuationAreas={onOpenEvacuationAreas}
      onOpenPostUpdates={onOpenPostUpdates}
      actions={
        <>
          <button onClick={onOpenMonitoring} className={d.dashboard.topActions}>Open Monitoring</button>
          <button onClick={onOpenPostUpdates} className={d.dashboard.topActions}>Post Updates</button>
          <button onClick={onOpenEvacuationAreas} className={d.dashboard.topPrimary}>Manage Evacuation Areas</button>
        </>
      }
    >
      <div className={d.dashboard.root}>
          {error ? <div className={d.page.error}>{error}</div> : null}

          <section className={d.dashboard.metricsGrid}>
            {cardsToRender.map((card) => (
              <article key={card.key} className={[d.dashboard.metricGradient, card.className].join(' ')}>
                <p className={d.dashboard.metricValue}>{card.value}</p>
                <p className={d.dashboard.metricLabel}>{card.label}</p>
              </article>
            ))}
          </section>

          <section className={d.dashboard.overviewGrid}>
            <article className={d.dashboard.reportsPanel}>
              <h2 className={d.dashboard.reportsTitle}>Incident Reports Overview</h2>
              <div className={d.dashboard.reportsContentGrid}>
                <table className={d.dashboard.reportsTable}>
                  <thead>
                    <tr>
                      <th>Case ID</th>
                      <th>Location</th>
                      <th className={d.dashboard.thHiddenMd}>Requested By</th>
                      <th>Status</th>
                      <th>Proof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((row) => (
                      <tr key={row.caseId}>
                        <td className={d.dashboard.tdStrong}>{row.caseId}</td>
                        <td className={d.dashboard.tdTruncate}>{row.location}</td>
                        <td className={d.dashboard.thHiddenMd}>{titleCase(row.requesterName || 'Unknown')}</td>
                        <td>
                          {row.status ? (
                            <span className={d.dashboard.statusChip}>
                              {titleCase(row.status)}
                            </span>
                          ) : (
                            <span className={d.dashboard.muted}>-</span>
                          )}
                        </td>
                        <td>
                          {row.imageBase64 ? (
                            <button
                              onClick={() => setPreviewImage(row.imageBase64 || null)}
                              className={d.btn.secondaryXs}
                            >
                              View
                            </button>
                          ) : (
                            <span className={d.dashboard.muted}>-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {incidents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={d.table.empty}>No incident reports yet.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </article>

            <article className={d.dashboard.statusMapPanel}>
              <div className={d.dashboard.statusColumn}>
                <div className={d.dashboard.statusCard}>
                  <h3 className={d.dashboard.statusTitle}>Evacuation Area Status</h3>
                  <div className={d.dashboard.statusList}>
                    {statusRows.map((area, idx) => (
                      <article
                        key={area.id}
                        className={[d.dashboard.areaCardBase, idx === 0 ? d.dashboard.areaCardActive : d.dashboard.areaCardIdle].join(' ')}
                      >
                        <p className={d.dashboard.areaName}>{area.name}</p>
                        <p className={d.dashboard.areaBarangay}>Barangay {area.barangay}</p>
                        <div className={d.dashboard.areaMeta}>
                          <span className={d.dashboard.areaOcc}>{area.occupancyLabel}</span>
                          <span className={d.dashboard.areaCap}>Capacity: {area.capacity}</span>
                        </div>
                        <p className={d.dashboard.areaBarangay}>Status: {area.occupancyStatus}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <div className={d.dashboard.smartAlertCard}>
                  <h3 className={d.dashboard.smartAlertTitle}>Smart Dashboard Alerts</h3>
                  <div className={d.dashboard.smartAlertList}>
                    {smartAlerts.length === 0 ? (
                      <p className={d.dashboard.smartAlertEmpty}>No high-risk barangay alerts triggered right now.</p>
                    ) : (
                      smartAlerts.map((item) => (
                        <p key={item.barangayKey} className={d.dashboard.smartAlertItem}>{item.alertMessage}</p>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className={d.dashboard.mapWrap}>
                <iframe ref={mapFrameRef} title="Evacuation map" srcDoc={mapHtml} className={d.dashboard.mapFrame} />
              </div>
            </article>
          </section>

          <section className={d.dashboard.insightsRow}>
            <div className={d.dashboard.reportsPriorityBlock}>
              <h3 className={d.dashboard.reportsPriorityTitle}>Risk Priority by Barangay</h3>
              <div className={d.dashboard.reportsPriorityGrid}>
                <article className={d.dashboard.priorityCardHigh}>
                  <p className={d.dashboard.priorityCardTitle}>High</p>
                  <div className={d.dashboard.priorityList}>
                    {highRiskBarangays.length === 0 ? <p className={d.dashboard.priorityEmpty}>No high risk barangays.</p> : highRiskBarangays.map((item) => (
                      <button
                        key={item.barangayKey}
                        type="button"
                        onClick={() => focusBarangayOnMap(item.barangayName, item.riskLevel)}
                        className={[d.dashboard.priorityButton, selectedRiskBarangayKey === item.barangayKey ? d.dashboard.priorityButtonActive : ''].join(' ')}
                      >
                        {item.barangayName}
                      </button>
                    ))}
                  </div>
                </article>

                <article className={d.dashboard.priorityCardMedium}>
                  <p className={d.dashboard.priorityCardTitle}>Moderate</p>
                  <div className={d.dashboard.priorityList}>
                    {mediumRiskBarangays.length === 0 ? <p className={d.dashboard.priorityEmpty}>No moderate risk barangays.</p> : mediumRiskBarangays.map((item) => (
                      <button
                        key={item.barangayKey}
                        type="button"
                        onClick={() => focusBarangayOnMap(item.barangayName, item.riskLevel)}
                        className={[d.dashboard.priorityButton, selectedRiskBarangayKey === item.barangayKey ? d.dashboard.priorityButtonActive : ''].join(' ')}
                      >
                        {item.barangayName}
                      </button>
                    ))}
                  </div>
                </article>

                <article className={d.dashboard.priorityCardLow}>
                  <p className={d.dashboard.priorityCardTitle}>Low</p>
                  <div className={d.dashboard.priorityList}>
                    {lowRiskBarangays.length === 0 ? <p className={d.dashboard.priorityEmpty}>No low risk barangays.</p> : lowRiskBarangays.map((item) => (
                      <button
                        key={item.barangayKey}
                        type="button"
                        onClick={() => focusBarangayOnMap(item.barangayName, item.riskLevel)}
                        className={[d.dashboard.priorityButton, selectedRiskBarangayKey === item.barangayKey ? d.dashboard.priorityButtonActive : ''].join(' ')}
                      >
                        {item.barangayName}
                      </button>
                    ))}
                  </div>
                </article>
              </div>
            </div>

            <div className={d.dashboard.rainRankCard}>
              <div className={d.dashboard.rainRankHead}>
                <h3 className={d.dashboard.rainRankTitle}>Barangays with Moderate–Severe Rainfall</h3>
                <p className={d.dashboard.rainRankUpdated}>
                  Updated: {rainLegendUpdatedAt ? new Date(rainLegendUpdatedAt).toLocaleTimeString() : '-'}
                </p>
              </div>
              {topRainBarangays.length === 0 ? (
                <p className={d.dashboard.rainRankEmpty}>No moderate or severe rainfall detected right now.</p>
              ) : (
                <div className={d.dashboard.rainRankList}>
                  {topRainBarangays.map((item, index) => (
                    <article key={`${item.barangayName}-${index}`} className={d.dashboard.rainRankRow}>
                      <p className={d.dashboard.rainRankName}>{`${index + 1}. ${item.barangayName}`}</p>
                      <p className={d.dashboard.rainRankMeta}>Intensity: {item.rainIntensityMmPerHour.toFixed(2)} mm/hr</p>
                      <p className={d.dashboard.rainRankMeta}>Risk: {item.rainLevel}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          {loading ? <p className={d.page.loading}>Refreshing dashboard data...</p> : null}

          {previewImage ? (
            <div className={d.modal.overlay}>
              <div className={d.modal.card}>
                <div className={d.modal.header}>
                  <h4 className={d.modal.title}>Submitted Proof Image</h4>
                  <button
                    onClick={() => setPreviewImage(null)}
                    className={d.modal.close}
                  >
                    Close
                  </button>
                </div>
                <img src={previewImage} alt="Submitted proof" className={d.modal.image} />
              </div>
            </div>
          ) : null}
      </div>
    </AdminShell>
  );
}
