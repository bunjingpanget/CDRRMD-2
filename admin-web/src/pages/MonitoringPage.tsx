import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api';
import cdrrmdLogo from '../assets/cdrrmd-logo.png';
import type { EvacuationAreaItem, MonitoringReport } from '../types';

type Props = {
  onLogout: () => void;
  onOpenDashboard: () => void;
  onOpenAdmin: () => void;
  onOpenEvacuationAreas: () => void;
  onAuthError: () => void;
};

const CALAMBA_BOUNDS = {
  latMin: 14.137703,
  latMax: 14.2662133,
  lonMin: 121.0218057,
  lonMax: 121.2214277,
};

type ReportMarker = {
  latitude: number;
  longitude: number;
  label: string;
  type: 'fire' | 'flood' | 'rescue';
};

function extractCoordinateFromLocationText(value: string) {
  const text = String(value || '');
  const latLngMatch = text.match(/lat\s*[:]?\s*(-?\d+(?:\.\d+)?)\s*[, ]+lng\s*[:]?\s*(-?\d+(?:\.\d+)?)/i);
  if (latLngMatch) {
    return {
      latitude: Number(latLngMatch[1]),
      longitude: Number(latLngMatch[2]),
    };
  }

  const plainPair = text.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (plainPair) {
    const lat = Number(plainPair[1]);
    const lon = Number(plainPair[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { latitude: lat, longitude: lon };
    }
  }

  return null;
}

function buildMapHtml(areas: EvacuationAreaItem[], reportMarkers: ReportMarker[]) {
  const serialized = JSON.stringify({ areas, reportMarkers });

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
    <style>
      html, body, #map { margin: 0; width: 100%; height: 100%; }
      body { background: #193750; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
    <script>
      var payload = ${serialized};
      var areas = payload.areas || [];
      var reportMarkers = payload.reportMarkers || [];
      var map = L.map('map', { zoomControl: false, attributionControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      var bounds = L.latLngBounds([
        [${CALAMBA_BOUNDS.latMin}, ${CALAMBA_BOUNDS.lonMin}],
        [${CALAMBA_BOUNDS.latMax}, ${CALAMBA_BOUNDS.lonMax}]
      ]);

      var markerIcon = L.divIcon({
        className: 'evac-pin',
        html: '<div style="width:14px;height:14px;background:#ef4444;border:2px solid #fff;border-radius:999px;box-shadow:0 2px 6px rgba(0,0,0,.35);"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      areas.forEach(function(area) {
        L.marker([area.latitude, area.longitude], { icon: markerIcon }).addTo(map).bindPopup(
          '<strong>' + area.name + '</strong><br/>' +
          area.barangay
        );
      });

      var reportIconByType = {
        fire: '#dc2626',
        flood: '#2563eb',
        rescue: '#f59e0b'
      };

      reportMarkers.forEach(function(item) {
        var marker = L.circleMarker([item.latitude, item.longitude], {
          radius: 7,
          color: '#ffffff',
          weight: 2,
          fillColor: reportIconByType[item.type] || '#0ea5e9',
          fillOpacity: 0.95,
        }).addTo(map);
        marker.bindPopup('<strong>' + item.label + '</strong>');
      });

      if (areas.length > 0 || reportMarkers.length > 0) {
        var points = [];
        areas.forEach(function(area) { points.push([area.latitude, area.longitude]); });
        reportMarkers.forEach(function(item) { points.push([item.latitude, item.longitude]); });

        var areaBounds = L.latLngBounds(points.map(function(point) {
          return point;
        }));
        map.fitBounds(bounds.extend(areaBounds).pad(0.08), { maxZoom: 14 });
      } else {
        map.fitBounds(bounds.pad(0.02), { maxZoom: 12 });
      }
    </script>
  </body>
</html>`;
}

function StatIcon({ color, children }: { color: string; children: ReactNode }) {
  return (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-md border"
      style={{ backgroundColor: `${color}22`, color, borderColor: `${color}66` }}
    >
      {children}
    </div>
  );
}

function MonitoringStat({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-md border border-slate-300 bg-[#f2f3f4] px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <StatIcon color={color}>{icon}</StatIcon>
        <div>
          <p className="text-[12px] font-semibold leading-tight text-[#3b4b57]">{label}</p>
          <p className="text-[23px] font-extrabold leading-tight text-[#132737]">{value}</p>
        </div>
      </div>
    </article>
  );
}

export default function MonitoringPage({ onLogout, onOpenDashboard, onOpenAdmin, onOpenEvacuationAreas, onAuthError }: Props) {
  const [evacuationAreas, setEvacuationAreas] = useState<EvacuationAreaItem[]>([]);
  const [reports, setReports] = useState<MonitoringReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingMap, setLoadingMap] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData(showLoading = true) {
      if (showLoading) {
        setLoadingMap(true);
      }
      setError(null);
      try {
        const [areasResponse, reportsResponse] = await Promise.all([
          api.get('/content/evacuation-areas'),
          api.get('/reports'),
        ]);

        setEvacuationAreas(Array.isArray(areasResponse.data) ? areasResponse.data : []);
        setReports(Array.isArray(reportsResponse.data) ? reportsResponse.data : []);
      } catch (err: any) {
        if (err?.response?.status === 401) {
          onAuthError();
          return;
        }
        setError(err?.response?.data?.message || 'Failed to load monitoring data.');
      } finally {
        if (showLoading) {
          setLoadingMap(false);
        }
      }
    }

    loadData(true);

    const refreshTimer = setInterval(() => {
      loadData(false);
    }, 5000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadData(false);
      }
    };

    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(refreshTimer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [onAuthError]);

  const incidents = useMemo(
    () =>
      reports.map((item) => ({
        incidentId: item.report_code || `RPT-${String(item.id).padStart(6, '0')}`,
        type: item.report_type,
        barangay: item.location,
        reportedTime: new Date(item.created_at).toLocaleString(),
        status: item.report_type === 'rescue' ? (item.status || 'pending') : '',
        assignedTeam: item.report_type === 'rescue' ? (item.status === 'pending' ? 'Not Assigned' : 'Assigned') : '-',
        notes: item.notes || '',
        imageBase64: item.image_base64 || null,
        reporterName: `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.email || 'N/A',
        reporterNumber: item.contact_number || 'N/A',
        waterLevel: item.water_level || null,
      })),
    [reports],
  );

  const reportMarkers = useMemo(
    () =>
      reports
        .map((item) => {
          const lat = item.latitude ?? null;
          const lon = item.longitude ?? null;

          if (lat !== null && lon !== null && Number.isFinite(lat) && Number.isFinite(lon)) {
            return {
              latitude: Number(lat),
              longitude: Number(lon),
              label: item.report_code || item.incident_type,
              type: item.report_type,
            };
          }

          const parsed = extractCoordinateFromLocationText(item.location);
          if (!parsed) {
            return null;
          }

          return {
            latitude: parsed.latitude,
            longitude: parsed.longitude,
            label: item.report_code || item.incident_type,
            type: item.report_type,
          };
        })
        .filter((item): item is ReportMarker => item !== null),
    [reports],
  );

  const stats = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return {
      totalReportsToday: reports.filter((item) => new Date(item.created_at).getTime() >= start).length,
      activeIncidents: incidents.filter((item) => item.status.toLowerCase() !== 'resolved').length,
      teamDispatched: incidents.filter((item) => item.status.toLowerCase() !== 'pending').length,
      resolvedIncidents: incidents.filter((item) => item.status.toLowerCase() === 'resolved').length,
    };
  }, [incidents, reports]);

  const selectedIncident = incidents[0] ?? null;
  const mapHtml = useMemo(() => buildMapHtml(evacuationAreas, reportMarkers), [evacuationAreas, reportMarkers]);

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-[#d5d6d8] text-[#142b3a]">
      <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[205px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-2 bg-[#07173a] px-3 py-2 lg:min-h-dvh">
          <div className="mb-1 flex items-center gap-2 border-b border-slate-700 pb-3">
            <img src={cdrrmdLogo} alt="CDRRMD logo" className="h-8 w-8 rounded-full border border-[#f6d84c] bg-white object-cover" />
            <h1 className="text-[1.65rem] font-black tracking-tight text-white">CDRRMD</h1>
          </div>

          <nav className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:mt-2 lg:flex lg:flex-col lg:space-y-4 lg:text-base">
            <button
              onClick={onOpenDashboard}
              className="w-full rounded-md px-3 py-2.5 text-left font-semibold text-slate-200 hover:bg-[#0d2a52]"
            >
              Dashboard
            </button>
            <button onClick={onOpenAdmin} className="w-full rounded-md px-3 py-2.5 text-left font-semibold text-slate-200 hover:bg-[#0d2a52]">Admin</button>
            <button className="w-full rounded-md bg-[#0c3e69] px-3 py-2.5 text-left font-bold text-white">Monitoring</button>
            <button
              onClick={onOpenEvacuationAreas}
              className="w-full rounded-md px-3 py-2.5 text-left font-semibold text-slate-200 hover:bg-[#0d2a52]"
            >
              Evacuation Areas
            </button>
          </nav>

          <button
            onClick={onLogout}
            className="mt-1 w-full rounded-md border border-slate-600 bg-[#1a2a46] px-3 py-2.5 text-sm font-bold text-white transition hover:bg-[#223355] lg:mb-2 lg:mt-auto"
          >
            Logout
          </button>
        </aside>

        <main className="w-full min-w-0 space-y-3 p-3 md:p-4 lg:grid lg:min-h-dvh lg:grid-rows-[auto_minmax(18rem,40dvh)_minmax(0,1fr)] lg:gap-3 lg:space-y-0 lg:overflow-hidden">
          {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div> : null}

          <section className="rounded-md border border-[#91b2d2] bg-[#e9edf1] px-3 py-2">
            <h2 className="text-[1.15rem] font-bold text-[#163147]">Incident Monitoring Dashboard</h2>

            <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <MonitoringStat
                label="Total Reports Today"
                value={stats.totalReportsToday}
                color="#1f4f73"
                icon={
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="3" width="16" height="18" rx="2" />
                    <path d="M8 7h8M8 11h6M8 15h8" />
                  </svg>
                }
              />
              <MonitoringStat
                label="Active Incidents"
                value={stats.activeIncidents}
                color="#ef4444"
                icon={
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3l9 18H3L12 3z" />
                    <path d="M12 9v5M12 18h.01" />
                  </svg>
                }
              />
              <MonitoringStat
                label="Team Dispatched"
                value={stats.teamDispatched}
                color="#1d6ca0"
                icon={
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="3" />
                    <path d="M20 8v6M23 11h-6" />
                  </svg>
                }
              />
              <MonitoringStat
                label="Resolved Incidents"
                value={stats.resolvedIncidents}
                color="#2f8f4f"
                icon={
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                }
              />
            </div>
          </section>

          <section className="grid gap-2 2xl:grid-cols-[1fr_0.36fr] lg:min-h-0">
            <article className="min-h-[clamp(16rem,34vh,26rem)] overflow-hidden rounded-md border border-slate-400 bg-[#1c3f5a] lg:h-full">
              <iframe title="Monitoring map" srcDoc={mapHtml} className="h-full w-full border-0" />
            </article>

            <article className="rounded-md border border-slate-400 bg-[#e6e6e7] p-2 lg:h-full lg:overflow-auto">
              <h3 className="border-b border-slate-400 pb-1 text-[1rem] font-bold text-[#19374f]">Incident Details</h3>
              <div className="mt-2 space-y-1 text-[11px] leading-tight text-[#233f53]">
                <p className="font-bold">{selectedIncident?.incidentId || 'N/A'}</p>
                <p>Type: {selectedIncident?.type || 'N/A'}</p>
                <p>Location: {selectedIncident?.barangay || 'N/A'}</p>
                <p>Reported Time: {selectedIncident?.reportedTime || 'N/A'}</p>
                <p>Severity: High</p>
                <p className="pt-2">Reported By: {selectedIncident?.reporterName || 'N/A'}</p>
                <p>Contact: {selectedIncident?.reporterNumber || 'N/A'}</p>
                <p>Assigned Team: {selectedIncident?.assignedTeam || 'N/A'}</p>
                <p>Dispatch Time: N/A</p>
                <p>State: N/A</p>
              </div>
            </article>
          </section>

          <section className="grid min-h-[clamp(16rem,26vh,24rem)] gap-2 2xl:grid-cols-[1fr_0.9fr] lg:min-h-0">
            <article className="rounded-md border border-slate-400 bg-[#e7eaec] p-2 lg:min-h-0 lg:overflow-hidden">
              <h3 className="border-b border-slate-400 pb-1 text-[1rem] font-bold text-[#19374f]">Active Incidents</h3>
              <div className="mt-2 overflow-auto lg:h-[calc(100%-2rem)]">
                <table className="w-full table-fixed text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-300 text-[#37556c]">
                      <th className="px-1 py-1 font-semibold">Incident ID</th>
                      <th className="px-1 py-1 font-semibold">Type</th>
                      <th className="hidden px-1 py-1 font-semibold md:table-cell">Barangay</th>
                      <th className="hidden px-1 py-1 font-semibold lg:table-cell">Reported Time</th>
                      <th className="px-1 py-1 font-semibold">Status</th>
                      <th className="hidden px-1 py-1 font-semibold md:table-cell">Assigned Team</th>
                      <th className="px-1 py-1 font-semibold">Proof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-2 py-8 text-center text-[12px] text-slate-500">
                          No incidents received from user-app yet.
                        </td>
                      </tr>
                    ) : (
                      incidents.map((item) => (
                        <tr key={item.incidentId} className="border-b border-slate-200 text-[#233f53]">
                          <td className="px-1 py-1">{item.incidentId}</td>
                          <td className="px-1 py-1">{item.type}</td>
                          <td className="hidden truncate px-1 py-1 md:table-cell">{item.barangay}</td>
                          <td className="hidden px-1 py-1 lg:table-cell">{item.reportedTime}</td>
                          <td className="px-1 py-1">{item.status || '-'}</td>
                          <td className="hidden px-1 py-1 md:table-cell">{item.assignedTeam}</td>
                          <td className="px-1 py-1">
                            {item.imageBase64 ? (
                              <button
                                onClick={() => setPreviewImage(item.imageBase64 || null)}
                                className="rounded border border-blue-300 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700"
                              >
                                View
                              </button>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-md border border-slate-400 bg-[#eceff0] p-2 lg:min-h-0 lg:overflow-auto">
              <h3 className="border-b border-slate-400 pb-1 text-[1rem] font-bold text-[#19374f]">Report Validation</h3>
              {selectedIncident ? (
                <div className="mt-2 rounded border border-slate-300 bg-[#f5f6f7] p-2 text-[11px] text-[#233f53]">
                  <p className="font-bold">{selectedIncident.incidentId}</p>
                  <p>Type: {selectedIncident.type}</p>
                  <p>Location: {selectedIncident.barangay}</p>
                  <p>Reported Time: {selectedIncident.reportedTime}</p>
                  <p>Reporter: {selectedIncident.reporterName}</p>
                  <p>Contact: {selectedIncident.reporterNumber}</p>
                  {selectedIncident.waterLevel ? <p>Water Level: {selectedIncident.waterLevel}</p> : null}
                  <p>Severity: High</p>
                </div>
              ) : (
                <div className="mt-2 min-h-[clamp(8rem,16vh,12rem)] rounded border border-slate-300 bg-[#f5f6f7]" />
              )}
            </article>
          </section>

          {loadingMap ? <p className="text-xs text-slate-600">Loading monitoring map...</p> : null}

          {previewImage ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/70 p-4">
              <div className="w-full max-w-2xl rounded-lg bg-white p-3 shadow-xl">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-700">Submitted Proof Image</h4>
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600"
                  >
                    Close
                  </button>
                </div>
                <img src={previewImage} alt="Submitted proof" className="max-h-[82dvh] w-full rounded border border-slate-200 object-contain" />
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
