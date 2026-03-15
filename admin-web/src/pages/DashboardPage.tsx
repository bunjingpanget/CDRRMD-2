import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../api';
import cdrrmdLogo from '../assets/cdrrmd-logo.png';
import type {
  AlertItem,
  DashboardIncident,
  DashboardSummary,
  EvacuationAreaItem,
} from '../types';

type Props = {
  onLogout: () => void;
  onOpenAdmin: () => void;
  onOpenEvacuationAreas: () => void;
  onOpenMonitoring: () => void;
  onAuthError: () => void;
};

const CALAMBA_BOUNDS = {
  latMin: 14.137703,
  latMax: 14.2662133,
  lonMin: 121.0218057,
  lonMax: 121.2214277,
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

function buildMapHtml(areas: EvacuationAreaItem[]) {
  const serialized = JSON.stringify(areas);

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
    <style>
      html, body, #map { margin: 0; width: 100%; height: 100%; }
      body { background: #dfe7ee; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
    <script>
      var areas = ${serialized};
      var map = L.map('map', { zoomControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      var bounds = L.latLngBounds([
        [${CALAMBA_BOUNDS.latMin}, ${CALAMBA_BOUNDS.lonMin}],
        [${CALAMBA_BOUNDS.latMax}, ${CALAMBA_BOUNDS.lonMax}]
      ]);

      var markerIcon = L.divIcon({
        className: 'evac-pin',
        html: '<div style="width:16px;height:16px;background:#e11d48;border:3px solid #fff;border-radius:999px;box-shadow:0 2px 6px rgba(0,0,0,.3);"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      areas.forEach(function(area) {
        L.marker([area.latitude, area.longitude], { icon: markerIcon }).addTo(map).bindPopup(
          '<strong>' + area.name + '</strong><br/>' +
          area.barangay + '<br/>' +
          'Capacity: ' + area.capacity + '<br/>' +
          'Evacuees: ' + area.evacuees
        );
      });

      if (areas.length > 0) {
        var areaBounds = L.latLngBounds(areas.map(function(area) {
          return [area.latitude, area.longitude];
        }));
        map.fitBounds(bounds.extend(areaBounds).pad(0.08), { maxZoom: 14 });
      } else {
        map.fitBounds(bounds.pad(0.02), { maxZoom: 12 });
      }
    </script>
  </body>
</html>`;
}

export default function DashboardPage({ onLogout, onOpenAdmin, onOpenEvacuationAreas, onOpenMonitoring, onAuthError }: Props) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [areas, setAreas] = useState<EvacuationAreaItem[]>([]);
  const [incidents, setIncidents] = useState<DashboardIncident[]>([]);
  const [cards, setCards] = useState<DashboardSummary['cards']>({
    emergencyAlerts: 0,
    activeTeams: 0,
    evacuationAreas: 0,
    totalEvacuees: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [alertTitle, setAlertTitle] = useState('');
  const [alertBody, setAlertBody] = useState('');
  const [alertCategory, setAlertCategory] = useState('typhoon');
  const [alertSeverity, setAlertSeverity] = useState('high');

  const [newsTitle, setNewsTitle] = useState('');
  const [newsBody, setNewsBody] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  async function loadFeed(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      const [alertsResponse, areasResponse, summaryResponse] = await Promise.all([
        api.get('/content/alerts'),
        api.get('/content/evacuation-areas'),
        api.get('/content/dashboard-summary'),
      ]);

      setAlerts(alertsResponse.data);
      setAreas(areasResponse.data);
      setCards(summaryResponse.data.cards);
      setIncidents(summaryResponse.data.incidents);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        onAuthError();
        return;
      }
      setError(err?.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadFeed(true);

    const refreshTimer = setInterval(() => {
      loadFeed(false);
    }, 7000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadFeed(false);
      }
    };

    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(refreshTimer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  async function submitAlert(event: FormEvent) {
    event.preventDefault();
    await api.post('/content/alerts', {
      title: alertTitle,
      body: alertBody,
      category: alertCategory,
      severity: alertSeverity,
    });
    setAlertTitle('');
    setAlertBody('');
    await loadFeed();
  }

  async function submitNews(event: FormEvent) {
    event.preventDefault();
    await api.post('/content/announcements', {
      title: newsTitle,
      body: newsBody,
    });
    setNewsTitle('');
    setNewsBody('');
    await loadFeed();
  }

  const mapHtml = useMemo(() => buildMapHtml(areas), [areas]);

  const statusRows = useMemo(
    () =>
      areas.map((area) => ({
        ...area,
        occupancyLabel: `${area.evacuees}/${area.capacity}`,
      })),
    [areas],
  );

  const cardsToRender = [
    {
      key: 'emergencyAlerts',
      label: 'Emergency Alerts',
      value: cards.emergencyAlerts,
      className: 'from-[#f25358] to-[#ef8b8f]',
    },
    {
      key: 'activeTeams',
      label: 'Active Teams',
      value: cards.activeTeams,
      className: 'from-[#2ca3d8] to-[#67c8db]',
    },
    {
      key: 'evacuationAreas',
      label: 'Evacuation Areas',
      value: cards.evacuationAreas,
      className: 'from-[#efad09] to-[#efd24c]',
    },
    {
      key: 'totalEvacuees',
      label: 'Total Evacuees',
      value: cards.totalEvacuees,
      className: 'from-[#2bb39e] to-[#72d5a2]',
    },
  ];

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-[#dfe4ea] text-[#0f2948]">
      <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[205px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-2 bg-[#07173a] px-3 py-2 lg:min-h-dvh">
          <div className="mb-1 flex items-center gap-2 border-b border-slate-700 pb-3">
            <img src={cdrrmdLogo} alt="CDRRMD logo" className="h-8 w-8 rounded-full border border-[#f6d84c] bg-white object-cover" />
            <h1 className="text-[1.65rem] font-black tracking-tight text-white">CDRRMD</h1>
          </div>

          <nav className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:mt-2 lg:flex lg:flex-col lg:space-y-4 lg:text-base">
            <button className="w-full rounded-md bg-[#0c3e69] px-3 py-2.5 text-left font-bold text-white">Dashboard</button>
            <button onClick={onOpenAdmin} className="w-full rounded-md px-3 py-2.5 text-left font-semibold text-slate-200 hover:bg-[#0d2a52]">Admin</button>
            <button
              onClick={onOpenMonitoring}
              className="w-full rounded-md px-3 py-2.5 text-left font-semibold text-slate-200 hover:bg-[#0d2a52]"
            >
              Monitoring
            </button>
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

        <main className="w-full min-w-0 space-y-3 p-3 md:p-4 lg:min-h-dvh lg:overflow-y-auto">
          {error ? <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

          <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {cardsToRender.map((card) => (
              <article key={card.key} className={`rounded-lg bg-gradient-to-r px-3 py-2 text-white shadow ${card.className}`}>
                <p className="text-[1.7rem] font-black leading-none">{card.value}</p>
                <p className="mt-1 text-[0.95rem] font-extrabold">{card.label}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-2 2xl:grid-cols-[1.1fr_1fr]">
            <article className="rounded-lg border border-slate-300 bg-[#f8fafc] p-2">
              <h2 className="text-[1.2rem] font-black leading-tight">Incident Reports Overview</h2>
              <div className="mt-2 max-h-[clamp(14rem,32vh,22rem)] overflow-auto">
                <table className="w-full table-fixed text-left">
                  <thead>
                    <tr className="text-[0.75rem] font-semibold text-slate-600">
                      <th className="pb-2">Case ID</th>
                      <th className="pb-2">Location</th>
                      <th className="hidden pb-2 md:table-cell">Type</th>
                      <th className="hidden pb-2 md:table-cell">Status</th>
                      <th className="pb-2">Proof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(incidents.length > 0
                      ? incidents
                      : alerts.slice(0, 20).map((item, idx) => ({
                          caseId: `INC-${String(idx + 1).padStart(3, '0')}`,
                          location: 'Calamba City',
                          type: item.category,
                          status: item.severity,
                          title: item.title,
                          createdAt: item.created_at,
                          imageBase64: null,
                        }))
                    ).map((row) => (
                      <tr key={row.caseId} className="border-t border-slate-200 text-[0.75rem]">
                        <td className="py-1.5 pr-3 font-semibold text-slate-700">{row.caseId}</td>
                        <td className="truncate py-1.5 pr-3 text-slate-600">{row.location}</td>
                        <td className="hidden py-1.5 pr-3 md:table-cell">{titleCase(row.type)}</td>
                        <td className="hidden py-1.5 pr-3 md:table-cell">
                          {row.status ? (
                            <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-bold text-slate-700">
                              {titleCase(row.status)}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-1.5 pr-3">
                          {row.imageBase64 ? (
                            <button
                              onClick={() => setPreviewImage(row.imageBase64 || null)}
                              className="rounded border border-blue-300 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700"
                            >
                              View
                            </button>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="grid gap-2 rounded-lg border border-slate-300 bg-[#f8fafc] p-2 lg:grid-cols-[1fr_1fr]">
              <div className="flex min-h-[clamp(14rem,30vh,22rem)] flex-col rounded-lg border border-slate-300 bg-white">
                <h3 className="border-b border-slate-200 px-3 py-2 text-[1rem] font-black leading-tight">Evacuation Area Status</h3>
                <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
                  {statusRows.map((area, idx) => (
                    <article
                      key={area.id}
                      className={`rounded-lg border p-2 ${
                        idx === 0 ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <p className="text-xs font-extrabold text-[#12314b]">{area.name}</p>
                      <p className="text-[11px] text-slate-500">Barangay {area.barangay}</p>
                      <div className="mt-1 flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-amber-600">{area.occupancyLabel}</span>
                        <span className="text-slate-600">Capacity: {area.capacity}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="min-h-[clamp(14rem,30vh,22rem)] overflow-hidden rounded-lg border border-slate-300 bg-white">
                <iframe title="Evacuation map" srcDoc={mapHtml} className="h-full w-full border-0" />
              </div>
            </article>
          </section>

          <section className="grid gap-2 xl:grid-cols-2">
            <form onSubmit={submitAlert} className="rounded-lg border border-slate-300 bg-[#f8fafc] p-3">
              <h3 className="text-[1rem] font-black">Post Latest Alert</h3>
              <input
                value={alertTitle}
                onChange={(e) => setAlertTitle(e.target.value)}
                placeholder="Alert title"
                className="mt-2 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs"
                required
              />
              <textarea
                value={alertBody}
                onChange={(e) => setAlertBody(e.target.value)}
                placeholder="Details"
                className="mt-2 h-16 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                required
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select value={alertCategory} onChange={(e) => setAlertCategory(e.target.value)} className="h-8 rounded-lg border border-slate-300 px-2 text-xs">
                  <option value="typhoon">Typhoon</option>
                  <option value="flood">Flood</option>
                  <option value="fire">Fire</option>
                  <option value="earthquake">Earthquake</option>
                </select>
                <select value={alertSeverity} onChange={(e) => setAlertSeverity(e.target.value)} className="h-8 rounded-lg border border-slate-300 px-2 text-xs">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <button className="mt-2 rounded-lg bg-[#ef4444] px-4 py-1.5 text-xs font-bold text-white">Publish Alert</button>
            </form>

            <form onSubmit={submitNews} className="rounded-lg border border-slate-300 bg-[#f8fafc] p-3">
              <h3 className="text-[1rem] font-black">Post News & Announcement</h3>
              <input
                value={newsTitle}
                onChange={(e) => setNewsTitle(e.target.value)}
                placeholder="News title"
                className="mt-2 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs"
                required
              />
              <textarea
                value={newsBody}
                onChange={(e) => setNewsBody(e.target.value)}
                placeholder="Details"
                className="mt-2 h-16 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                required
              />
              <button className="mt-2 rounded-lg bg-[#0b7db7] px-4 py-1.5 text-xs font-bold text-white">Publish News</button>
            </form>
          </section>

          {loading ? <p className="mt-3 text-sm text-slate-500">Refreshing dashboard data...</p> : null}

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
