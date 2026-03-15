import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import cdrrmdLogo from '../assets/cdrrmd-logo.png';
import type { EvacuationAreaItem } from '../types';

type Props = {
  onLogout: () => void;
  onOpenDashboard: () => void;
  onOpenAdmin: () => void;
  onOpenMonitoring: () => void;
};

type DetailForm = {
  id: number;
  name: string;
  barangay: string;
  placeType: string;
  address: string;
  capacity: string;
  latitude: string;
  longitude: string;
};

const CALAMBA_CENTER = { latitude: 14.206021, longitude: 121.1556496 };

function toForm(area: EvacuationAreaItem): DetailForm {
  return {
    id: area.id,
    name: area.name,
    barangay: area.barangay,
    placeType: area.place_type || '',
    address: area.address || '',
    capacity: String(area.capacity ?? 0),
    latitude: String(area.latitude),
    longitude: String(area.longitude),
  };
}

function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function buildMapHtml(areas: EvacuationAreaItem[], selectedId: number | null) {
  const payload = JSON.stringify({ areas, selectedId });
  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
    <style>
      html, body, #map { margin: 0; width: 100%; height: 100%; }
      .pin {
        width: 16px;
        height: 16px;
        border-radius: 999px;
        background: #e11d48;
        border: 3px solid #fff;
        box-shadow: 0 2px 6px rgba(0,0,0,.35);
      }
      .pin.selected {
        background: #14b8a6;
        width: 18px;
        height: 18px;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
    <script>
      var data = ${payload};
      var map = L.map('map', { zoomControl: true }).setView([${CALAMBA_CENTER.latitude}, ${CALAMBA_CENTER.longitude}], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      var markers = [];
      data.areas.forEach(function(area) {
        var isSelected = Number(area.id) === Number(data.selectedId);
        var icon = L.divIcon({
          className: '',
          html: '<div class="pin' + (isSelected ? ' selected' : '') + '"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        var marker = L.marker([area.latitude, area.longitude], { icon: icon }).addTo(map);
        marker.on('click', function() {
          window.parent.postMessage({ type: 'evac-select', id: area.id }, '*');
        });
        markers.push(marker);
      });

      if (markers.length > 0) {
        var bounds = L.latLngBounds(markers.map(function(marker){ return marker.getLatLng(); }));
        map.fitBounds(bounds.pad(0.15), { maxZoom: 15 });
      }
    </script>
  </body>
</html>`;
}

export default function EvacuationAreasPage({ onLogout, onOpenDashboard, onOpenAdmin, onOpenMonitoring }: Props) {
  const [areas, setAreas] = useState<EvacuationAreaItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<DetailForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/content/evacuation-areas');
      const nextAreas = data as EvacuationAreaItem[];
      setAreas(nextAreas);

      if (nextAreas.length === 0) {
        setSelectedId(null);
        setForm(null);
      } else {
        const activeId = selectedId && nextAreas.some((area) => area.id === selectedId) ? selectedId : nextAreas[0].id;
        setSelectedId(activeId);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load evacuation areas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setForm(null);
      return;
    }

    const area = areas.find((item) => item.id === selectedId);
    if (!area) {
      setForm(null);
      return;
    }

    setForm(toForm(area));
  }, [areas, selectedId]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const payload = event.data;
      if (!payload || payload.type !== 'evac-select') {
        return;
      }
      const id = Number(payload.id);
      if (!Number.isFinite(id)) {
        return;
      }
      setSelectedId(id);
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  async function onAddPin() {
    setSaving(true);
    setError(null);
    try {
      const suffix = areas.length + 1;
      const { data } = await api.post('/content/evacuation-areas', {
        name: `New Evacuation Area ${suffix}`,
        barangay: 'Calamba',
        placeType: 'Covered Court',
        address: `Calamba City, Laguna, Philippines`,
        capacity: 120,
        evacuees: 0,
        latitude: CALAMBA_CENTER.latitude,
        longitude: CALAMBA_CENTER.longitude,
      });

      const created = data as EvacuationAreaItem;
      await reload();
      setSelectedId(created.id);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create evacuation pin.');
    } finally {
      setSaving(false);
    }
  }

  async function onSaveDetails() {
    if (!form) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.put(`/content/evacuation-areas/${form.id}`, {
        name: form.name,
        barangay: form.barangay,
        placeType: form.placeType,
        address: form.address,
        capacity: Number(form.capacity || 0),
        evacuees: areas.find((item) => item.id === form.id)?.evacuees ?? 0,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        isActive: true,
      });
      await reload();
      setSelectedId(form.id);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update evacuation pin.');
    } finally {
      setSaving(false);
    }
  }

  async function onDeletePin() {
    if (!form) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.delete(`/content/evacuation-areas/${form.id}`);
      await reload();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete evacuation pin.');
    } finally {
      setSaving(false);
    }
  }

  const mapHtml = useMemo(() => buildMapHtml(areas, selectedId), [areas, selectedId]);

  const otherAreas = useMemo<Array<EvacuationAreaItem & { distanceKm: number }>>(() => {
    const origin = form
      ? { latitude: Number(form.latitude), longitude: Number(form.longitude) }
      : CALAMBA_CENTER;

    return areas
      .filter((item) => (form ? item.id !== form.id : true))
      .map((item) => ({
        ...item,
        distanceKm: haversineKm(origin, { latitude: item.latitude, longitude: item.longitude }),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [areas, form]);

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-[#d2d7de] text-[#0f2948]">
      <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[205px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-2 bg-[#07173a] px-3 py-2 lg:min-h-dvh">
          <div className="mb-1 flex items-center gap-2 border-b border-slate-700 pb-3">
            <img src={cdrrmdLogo} alt="CDRRMD logo" className="h-8 w-8 rounded-full border border-[#f6d84c] bg-white object-cover" />
            <h1 className="text-[1.65rem] font-black tracking-tight text-white">CDRRMD</h1>
          </div>

          <nav className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:mt-2 lg:flex lg:flex-col lg:space-y-4 lg:text-base">
            <button onClick={onOpenDashboard} className="w-full rounded-md px-3 py-2.5 text-left font-semibold text-slate-200 hover:bg-[#0d2a52]">
              Dashboard
            </button>
            <button onClick={onOpenAdmin} className="w-full rounded-md px-3 py-2.5 text-left font-semibold text-slate-200 hover:bg-[#0d2a52]">
              Admin
            </button>
            <button onClick={onOpenMonitoring} className="w-full rounded-md px-3 py-2.5 text-left font-semibold text-slate-200 hover:bg-[#0d2a52]">
              Monitoring
            </button>
            <button className="w-full rounded-md bg-[#0c3e69] px-3 py-2.5 text-left font-bold text-white">
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

        <main className="w-full min-w-0 p-3 md:p-4 lg:min-h-dvh lg:overflow-y-auto">
          <div className="flex h-full flex-col rounded-lg border border-slate-300 bg-[#e6eaef] p-2">
            <div className="mb-2 flex flex-wrap justify-end gap-2">
              <button
                onClick={onAddPin}
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                Add Evacuation Area Pin
              </button>
            </div>

            {error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div> : null}

            <div className="grid flex-1 gap-2 2xl:grid-cols-[1.3fr_1fr] 2xl:overflow-hidden">
              <section className="rounded-lg border border-slate-300 bg-[#f2f4f7] p-2 xl:flex xl:flex-col">
                <h2 className="text-[1rem] font-black leading-tight">Evacuation Areas</h2>
                <div className="mt-2 min-h-[clamp(16rem,34vh,28rem)] overflow-hidden rounded border border-slate-300 bg-white xl:h-full">
                  <iframe title="Evacuation area map" srcDoc={mapHtml} className="h-full w-full border-0" />
                </div>
              </section>

              <section className="rounded-lg border border-slate-300 bg-[#f2f4f7] xl:flex xl:flex-col xl:overflow-hidden">
                <h2 className="border-b border-slate-300 px-3 py-2 text-[1rem] font-black">Evacuation Details</h2>

                <div className="px-3 py-2">
                  <p className="mb-2 text-xs font-bold text-slate-600">Selected Pin Details</p>

                  <div className="space-y-2">
                    <input
                      value={form?.name || ''}
                      onChange={(e) => setForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                      placeholder="Name"
                        className="h-8 w-full rounded-md border border-slate-300 bg-[#f1f1f1] px-2 text-xs"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={form?.barangay || ''}
                        onChange={(e) => setForm((prev) => (prev ? { ...prev, barangay: e.target.value } : prev))}
                        placeholder="Barangay"
                        className="h-8 rounded-md border border-slate-300 bg-[#f1f1f1] px-2 text-xs"
                      />
                      <input
                        value={form?.placeType || ''}
                        onChange={(e) => setForm((prev) => (prev ? { ...prev, placeType: e.target.value } : prev))}
                        placeholder="Place Type"
                        className="h-8 rounded-md border border-slate-300 bg-[#f1f1f1] px-2 text-xs"
                      />
                    </div>
                    <input
                      value={form?.address || ''}
                      onChange={(e) => setForm((prev) => (prev ? { ...prev, address: e.target.value } : prev))}
                      placeholder="Address"
                      className="h-8 w-full rounded-md border border-slate-300 bg-[#f1f1f1] px-2 text-xs"
                    />
                    <div className="grid gap-2 sm:grid-cols-3">
                      <input
                        value={form?.capacity || ''}
                        onChange={(e) => setForm((prev) => (prev ? { ...prev, capacity: e.target.value } : prev))}
                        placeholder="Capacity"
                        className="h-8 rounded-md border border-slate-300 bg-[#f1f1f1] px-2 text-xs"
                      />
                      <input
                        value={form?.latitude || ''}
                        onChange={(e) => setForm((prev) => (prev ? { ...prev, latitude: e.target.value } : prev))}
                        placeholder="Latitude"
                        className="h-8 rounded-md border border-slate-300 bg-[#f1f1f1] px-2 text-xs"
                      />
                      <input
                        value={form?.longitude || ''}
                        onChange={(e) => setForm((prev) => (prev ? { ...prev, longitude: e.target.value } : prev))}
                        placeholder="Longitude"
                        className="h-8 rounded-md border border-slate-300 bg-[#f1f1f1] px-2 text-xs"
                      />
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <button
                      onClick={onSaveDetails}
                      disabled={!form || saving || loading}
                      className="h-8 rounded-md bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={onDeletePin}
                      disabled={!form || saving || loading}
                      className="h-8 rounded-md bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-300 px-3 py-2 xl:flex-1 xl:overflow-hidden">
                  <p className="mb-2 text-[0.95rem] font-black">Other Evacuation Areas</p>
                  <div className="min-h-[clamp(8rem,16vh,12rem)] space-y-2 overflow-y-auto pr-1 xl:h-full">
                    {otherAreas.map((area) => (
                      <button
                        key={area.id}
                        onClick={() => setSelectedId(area.id)}
                        className="w-full rounded-lg border border-slate-300 bg-[#f1f1f1] px-3 py-2 text-left hover:bg-slate-100"
                      >
                        <p className="text-xs font-black text-[#12314b]">{area.name}</p>
                        <p className="text-[11px] text-slate-500">{area.barangay}</p>
                        <p className="text-sm font-bold text-teal-600">{area.distanceKm.toFixed(2)} km away</p>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            {loading ? <p className="mt-2 text-sm text-slate-500">Loading evacuation data...</p> : null}
          </div>
        </main>
      </div>
    </div>
  );
}
