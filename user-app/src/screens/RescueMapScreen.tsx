import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../services/api';

type WeatherResponse = { current?: { temperature_2m?: number; weather_code?: number } };
type Coordinate = { latitude: number; longitude: number };
type EvacuationArea = {
  id: string;
  name: string;
  barangay: string;
  placeType: string;
  locationText: string;
  capacity: number;
  evacuees: number;
  latitude: number;
  longitude: number;
};
type RescueCandidate = {
  area: EvacuationArea;
  distanceKm: number;
  path: string[];
};
type RescuePlan = {
  area: EvacuationArea;
  distanceKm: number;
  etaMinutes: number;
  etaText: string;
  routeCoordinates: Coordinate[];
  source: 'osrm' | 'dijkstra';
};

const FALLBACK_WEATHER =
  'https://api.open-meteo.com/v1/forecast?latitude=14.2117&longitude=121.1653&current=temperature_2m,weather_code&timezone=auto';

const CALAMBA_BOUNDS = {
  latMin: 14.137703,
  latMax: 14.2662133,
  lonMin: 121.0218057,
  lonMax: 121.2214277,
};

const CALAMBA_NOMINATIM = {
  latitude: 14.206021,
  longitude: 121.1556496,
  bounds: [
    [14.137703, 121.0218057],
    [14.2662133, 121.2214277],
  ] as [[number, number], [number, number]],
  searchUrl: 'https://nominatim.openstreetmap.org/ui/search.html?q=Calamba',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const NOMINATIM_BARANGAY_CENTERS: Record<string, Coordinate> = {
  Hornalan: { latitude: 14.164732, longitude: 121.0638106 },
  Bunggo: { latitude: 14.157918, longitude: 121.0729918 },
  Burol: { latitude: 14.164082, longitude: 121.094613 },
  Laguerta: { latitude: 14.172736, longitude: 121.0852575 },
  Bubuyan: { latitude: 14.172324, longitude: 121.1041754 },
  Ulango: { latitude: 14.152461, longitude: 121.1167485 },
  Mabato: { latitude: 14.156822, longitude: 121.0373815 },
  Canlubang: { latitude: 14.231078, longitude: 121.091534 },
  Mayapa: { latitude: 14.207003, longitude: 121.139472 },
  Parian: { latitude: 14.207855, longitude: 121.168884 },
  Real: { latitude: 14.20764, longitude: 121.16165 },
  Saimsim: { latitude: 14.193298, longitude: 121.143395 },
};

function isLandPoint(point: Coordinate) {
  if (
    point.latitude < CALAMBA_BOUNDS.latMin ||
    point.latitude > CALAMBA_BOUNDS.latMax ||
    point.longitude < CALAMBA_BOUNDS.lonMin ||
    point.longitude > CALAMBA_BOUNDS.lonMax
  ) {
    return false;
  }

  const shorelineLonByLat =
    point.latitude < 14.19
      ? 121.188
      : point.latitude < 14.205
        ? 121.195
        : point.latitude < 14.22
          ? 121.201
          : point.latitude < 14.24
            ? 121.208
            : point.latitude < 14.255
              ? 121.213
              : 121.218;

  const likelyLagunaBayWater = point.longitude > shorelineLonByLat;
  return !likelyLagunaBayWater;
}

function snapToLandPoint(rawPoint: Coordinate) {
  const start = {
    latitude: clamp(rawPoint.latitude, CALAMBA_BOUNDS.latMin + 0.001, CALAMBA_BOUNDS.latMax - 0.001),
    longitude: clamp(rawPoint.longitude, CALAMBA_BOUNDS.lonMin + 0.001, CALAMBA_BOUNDS.lonMax - 0.001),
  };

  if (isLandPoint(start)) {
    return start;
  }

  const angleSteps = 18;
  for (let ring = 1; ring <= 18; ring += 1) {
    const radius = ring * 0.0011;
    for (let step = 0; step < angleSteps; step += 1) {
      const angle = (2 * Math.PI * step) / angleSteps;
      const candidate = {
        latitude: clamp(start.latitude + Math.sin(angle) * radius, CALAMBA_BOUNDS.latMin + 0.001, CALAMBA_BOUNDS.latMax - 0.001),
        longitude: clamp(start.longitude + Math.cos(angle) * radius, CALAMBA_BOUNDS.lonMin + 0.001, CALAMBA_BOUNDS.lonMax - 0.001),
      };

      if (isLandPoint(candidate)) {
        return candidate;
      }
    }
  }

  return { latitude: 14.2117, longitude: 121.1653 };
}

function createEvacuationAreas() {
  const siteTemplates = [
    { suffix: 'Covered Court', angleDeg: 30, radius: 0.0028 },
    { suffix: 'Elementary School', angleDeg: 160, radius: 0.0031 },
    { suffix: 'Multi-purpose Hall', angleDeg: 290, radius: 0.0029 },
  ];

  const anchoredBarangays = Object.entries(NOMINATIM_BARANGAY_CENTERS);

  return anchoredBarangays.flatMap(([barangay, anchor], index) => {
    const centerPoint = snapToLandPoint(anchor);

    return siteTemplates.map((site, siteIndex) => {
      const angle = (site.angleDeg * Math.PI) / 180;
      const rawPoint = {
        latitude: centerPoint.latitude + Math.sin(angle) * site.radius,
        longitude: centerPoint.longitude + Math.cos(angle) * site.radius,
      };
      const snapped = snapToLandPoint(rawPoint);
      const capacity = 120 + ((index * 19 + siteIndex * 41) % 240);
      const evacuees = Math.max(0, Math.floor(capacity * (0.2 + (((index + siteIndex * 3) % 6) * 0.11))));
      const placeType = site.suffix;
      const locationText = `${barangay} ${placeType}, Barangay ${barangay}, Calamba City, Laguna, Philippines`;

      return {
        id: `E${index + 1}-${siteIndex + 1}`,
        barangay,
        name: `${barangay} ${site.suffix}`,
        address: `Barangay ${barangay}, Calamba City`,
        placeType,
        locationText,
        capacity,
        evacuees,
        latitude: snapped.latitude,
        longitude: snapped.longitude,
      };
    });
  });
}

const fallbackEvacuationAreas = createEvacuationAreas();

const junctionNodes: Array<{ id: string; latitude: number; longitude: number }> = [
  { id: 'J1', latitude: 14.2202, longitude: 121.1658 },
  { id: 'J2', latitude: 14.2088, longitude: 121.1768 },
  { id: 'J3', latitude: 14.2146, longitude: 121.1521 },
  { id: 'J4', latitude: 14.2012, longitude: 121.1678 },
  { id: 'J5', latitude: 14.2302, longitude: 121.1719 },
  { id: 'J6', latitude: 14.2243, longitude: 121.1908 },
  { id: 'J7', latitude: 14.1968, longitude: 121.1879 },
  { id: 'J8', latitude: 14.2355, longitude: 121.1444 },
];

const junctionEdges: Array<[string, string]> = [
  ['J1', 'J2'],
  ['J1', 'J3'],
  ['J1', 'J5'],
  ['J2', 'J4'],
  ['J2', 'J5'],
  ['J2', 'J6'],
  ['J2', 'J7'],
  ['J3', 'J5'],
  ['J3', 'J8'],
  ['J3', 'J4'],
  ['J4', 'J7'],
  ['J5', 'J6'],
  ['J5', 'J8'],
  ['J6', 'J7'],
];

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function haversineKm(a: Coordinate, b: Coordinate) {
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

function buildGraph(userLocation: Coordinate, evacuationAreas: EvacuationArea[]) {
  const userNode = { id: 'U', latitude: userLocation.latitude, longitude: userLocation.longitude };
  const nodes = [...evacuationAreas, ...junctionNodes, userNode];
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const adj = new Map<string, Array<{ to: string; weight: number }>>();

  nodes.forEach((node) => adj.set(node.id, []));

  junctionEdges.forEach(([a, b]) => {
    const from = nodeMap.get(a);
    const to = nodeMap.get(b);
    if (!from || !to) {
      return;
    }

    const distance = haversineKm(from, to) * 1.28;
    adj.get(a)?.push({ to: b, weight: distance });
    adj.get(b)?.push({ to: a, weight: distance });
  });

  evacuationAreas.forEach((area) => {
    const nearestJunctions = junctionNodes
      .map((junction) => ({ id: junction.id, distance: haversineKm(area, junction) * 1.12 }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2);

    nearestJunctions.forEach((item) => {
      adj.get(area.id)?.push({ to: item.id, weight: item.distance });
      adj.get(item.id)?.push({ to: area.id, weight: item.distance });
    });
  });

  const nearestJunctions = junctionNodes
    .map((node) => ({ id: node.id, distance: haversineKm(userNode, node) * 1.18 }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);

  nearestJunctions.forEach((item) => {
    adj.get('U')?.push({ to: item.id, weight: item.distance });
    adj.get(item.id)?.push({ to: 'U', weight: item.distance });
  });

  return { nodes: nodeMap, adj };
}

function dijkstra(
  adj: Map<string, Array<{ to: string; weight: number }>>,
  source: string,
  target: string,
) {
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const unvisited = new Set<string>(Array.from(adj.keys()));

  unvisited.forEach((key) => {
    dist.set(key, Number.POSITIVE_INFINITY);
    prev.set(key, null);
  });
  dist.set(source, 0);

  while (unvisited.size > 0) {
    let current: string | null = null;
    let currentDist = Number.POSITIVE_INFINITY;

    unvisited.forEach((node) => {
      const nodeDist = dist.get(node) ?? Number.POSITIVE_INFINITY;
      if (nodeDist < currentDist) {
        currentDist = nodeDist;
        current = node;
      }
    });

    if (!current || current === target || currentDist === Number.POSITIVE_INFINITY) {
      break;
    }

    unvisited.delete(current);
    const neighbors = adj.get(current) ?? [];
    neighbors.forEach((neighbor) => {
      if (!unvisited.has(neighbor.to)) {
        return;
      }

      const alt = currentDist + neighbor.weight;
      if (alt < (dist.get(neighbor.to) ?? Number.POSITIVE_INFINITY)) {
        dist.set(neighbor.to, alt);
        prev.set(neighbor.to, current);
      }
    });
  }

  const path: string[] = [];
  let cursor: string | null = target;
  while (cursor) {
    path.unshift(cursor);
    cursor = prev.get(cursor) ?? null;
  }

  return {
    distanceKm: dist.get(target) ?? Number.POSITIVE_INFINITY,
    path: path[0] === source ? path : [],
  };
}

function formatEtaText(etaMinutes: number) {
  return `${Math.max(etaMinutes - 1, 1)} - ${etaMinutes + 3} mins`;
}

async function fetchRoadRoute(from: Coordinate, to: Coordinate) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/${from.longitude},${from.latitude};` +
    `${to.longitude},${to.latitude}?overview=full&geometries=geojson&alternatives=false&steps=false`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OSRM route request failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    code?: string;
    routes?: Array<{ distance?: number; duration?: number; geometry?: { coordinates?: number[][] } }>;
  };

  const route = payload.routes?.[0];
  const coordinates = route?.geometry?.coordinates ?? [];
  if (!route || !route.distance || !route.duration || coordinates.length === 0) {
    throw new Error('No valid OSRM route found');
  }

  return {
    distanceKm: route.distance / 1000,
    etaMinutes: Math.max(3, Math.round(route.duration / 60)),
    routeCoordinates: coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
  };
}

async function resolveFastestRoadPlan(
  userLocation: Coordinate,
  evacuationAreas: EvacuationArea[],
): Promise<RescuePlan | null> {
  const candidateAreas = evacuationAreas
    .map((area) => ({ area, straightKm: haversineKm(area, userLocation) }))
    .sort((a, b) => a.straightKm - b.straightKm)
    .slice(0, 12)
    .map((item) => item.area);

  const routes = await Promise.all(
    candidateAreas.map(async (area) => {
      try {
        const road = await fetchRoadRoute(
          { latitude: area.latitude, longitude: area.longitude },
          userLocation,
        );

        return {
          area,
          distanceKm: road.distanceKm,
          etaMinutes: road.etaMinutes,
          etaText: formatEtaText(road.etaMinutes),
          routeCoordinates: road.routeCoordinates,
          source: 'osrm' as const,
        };
      } catch {
        return null;
      }
    }),
  );

  const valid = routes.filter(Boolean) as Array<NonNullable<(typeof routes)[number]>>;
  if (valid.length === 0) {
    return null;
  }

  valid.sort((a, b) => a.etaMinutes - b.etaMinutes);
  return valid[0];
}

function buildLeafletHtml(
  userLocation: Coordinate,
  allAreas: EvacuationArea[],
  selectedAreaId: EvacuationArea['id'] | null,
  showAreas: boolean,
  routeCoordinates: Coordinate[],
) {
  const serialized = JSON.stringify({ userLocation, allAreas, selectedAreaId, showAreas, routeCoordinates });

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
    <style>
      html,body,#map{margin:0;padding:0;width:100%;height:100%}
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
    <script>
      var data = ${serialized};
      var calambaCenter = [${CALAMBA_NOMINATIM.latitude}, ${CALAMBA_NOMINATIM.longitude}];
      var calambaBounds = L.latLngBounds([
        [${CALAMBA_NOMINATIM.bounds[0][0]}, ${CALAMBA_NOMINATIM.bounds[0][1]}],
        [${CALAMBA_NOMINATIM.bounds[1][0]}, ${CALAMBA_NOMINATIM.bounds[1][1]}]
      ]);
      var map = L.map('map', {
        zoomControl: true,
        minZoom: 11,
        maxZoom: 18,
        maxBounds: calambaBounds.pad(0.08),
        maxBoundsViscosity: 0.8,
      }).setView([data.userLocation.latitude, data.userLocation.longitude], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      var userMarker = L.circleMarker([data.userLocation.latitude, data.userLocation.longitude], {
        radius: 8,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.95
      }).addTo(map).bindPopup('Your location');

      var areaPinIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -22]
      });

      var selectedAreaPinIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/447/447031.png',
        iconSize: [26, 26],
        iconAnchor: [13, 26],
        popupAnchor: [0, -24]
      });

      if (data.showAreas) {
        var bounds = L.latLngBounds([[data.userLocation.latitude, data.userLocation.longitude]]);
        data.allAreas.forEach(function(area){
          var isSelected = area.id === data.selectedAreaId;
          var marker = L.marker([area.latitude, area.longitude], {
            icon: isSelected ? selectedAreaPinIcon : areaPinIcon
          }).addTo(map).bindPopup(
            '<strong>' + area.name + '</strong><br/>' +
            'Type: ' + area.placeType + '<br/>' +
            'Location: ' + area.locationText
          );

          marker.on('click', function() {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'select-area',
              areaId: area.id
            }));
          });
          bounds.extend([area.latitude, area.longitude]);
        });

        if (data.routeCoordinates && data.routeCoordinates.length > 1) {
          var routeLine = L.polyline(data.routeCoordinates.map(function(point){
            return [point.latitude, point.longitude];
          }), {
            color: '#0d3558',
            weight: 5,
            opacity: 0.92
          }).addTo(map);

          var routeBounds = routeLine.getBounds();
          if (routeBounds && routeBounds.isValid()) {
            map.fitBounds(routeBounds.pad(0.12), { maxZoom: 16 });
          } else if (bounds.isValid()) {
            map.fitBounds(bounds.pad(0.08), { maxZoom: 15 });
          }
        } else if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.08), { maxZoom: 15 });
        }
      } else {
        map.setView([data.userLocation.latitude, data.userLocation.longitude], 15);
      }

      L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);
      userMarker.openPopup();
    </script>
  </body>
</html>
`;
}

export default function RescueMapScreen() {
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [requestStarted, setRequestStarted] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<EvacuationArea['id'] | null>(null);
  const [proofImageUri, setProofImageUri] = useState<string | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [routeEtaText, setRouteEtaText] = useState<string | null>(null);
  const [routeSource, setRouteSource] = useState<'osrm' | 'dijkstra' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [evacuationAreas, setEvacuationAreas] = useState<EvacuationArea[]>(fallbackEvacuationAreas);

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);

      try {
        const areasResult = await api.get('/content/evacuation-areas').then((res) => res.data);
        if (Array.isArray(areasResult) && areasResult.length > 0) {
          const normalized: EvacuationArea[] = areasResult
            .map((item: any, index: number) => {
              const lat = Number(item?.latitude);
              const lon = Number(item?.longitude);
              if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
                return null;
              }

              return {
                id: String(item?.id ?? `db-${index + 1}`),
                name: String(item?.name || 'Evacuation Area'),
                barangay: String(item?.barangay || 'Calamba'),
                placeType: String(item?.place_type || item?.placeType || 'Evacuation Site'),
                locationText: String(
                  item?.address ||
                    `${String(item?.name || 'Evacuation Area')}, Barangay ${String(item?.barangay || 'Calamba')}, Calamba City, Laguna, Philippines`,
                ),
                capacity: Math.max(0, Number(item?.capacity || 0)),
                evacuees: Math.max(0, Number(item?.evacuees || 0)),
                latitude: lat,
                longitude: lon,
              };
            })
            .filter((item: EvacuationArea | null): item is EvacuationArea => Boolean(item));

          if (normalized.length > 0) {
            setEvacuationAreas(normalized);
          }
        }
      } catch {
        setEvacuationAreas(fallbackEvacuationAreas);
      }

      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status === 'granted') {
          const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        } else {
          setUserLocation({ latitude: 14.2128, longitude: 121.1671 });
        }
      } catch {
        setUserLocation({ latitude: 14.2128, longitude: 121.1671 });
      }

      setLoading(false);
    }

    bootstrap().catch(() => {
      setLoading(false);
    });
  }, []);

  const selectedArea = useMemo(
    () => evacuationAreas.find((area) => area.id === selectedAreaId) ?? null,
    [evacuationAreas, selectedAreaId],
  );

  function buildFallbackPlan(targetArea?: EvacuationArea) {
    if (!userLocation) {
      return null;
    }

    const { nodes, adj } = buildGraph(userLocation, evacuationAreas);

    if (targetArea) {
      const result = dijkstra(adj, targetArea.id, 'U');
      if (!Number.isFinite(result.distanceKm)) {
        return null;
      }

      const route = result.path
        .map((id) => nodes.get(id))
        .filter((node): node is { id: string; latitude: number; longitude: number } => Boolean(node))
        .map((node) => ({ latitude: node.latitude, longitude: node.longitude }))
        .reverse();

      const etaMinutes = Math.max(3, Math.round((result.distanceKm / 24) * 60));
      return {
        area: targetArea,
        distanceKm: result.distanceKm,
        etaText: formatEtaText(etaMinutes),
        routeCoordinates: route,
        source: 'dijkstra' as const,
      };
    }

    let best: RescueCandidate | null = null;
    for (const area of evacuationAreas) {
      const result = dijkstra(adj, area.id, 'U');
      if (!Number.isFinite(result.distanceKm)) {
        continue;
      }
      if (!best || result.distanceKm < best.distanceKm) {
        best = { area, distanceKm: result.distanceKm, path: result.path };
      }
    }

    if (!best) {
      return null;
    }

    const route = best.path
      .map((id) => nodes.get(id))
      .filter((node): node is { id: string; latitude: number; longitude: number } => Boolean(node))
      .map((node) => ({ latitude: node.latitude, longitude: node.longitude }))
      .reverse();
    const etaMinutes = Math.max(3, Math.round((best.distanceKm / 24) * 60));
    return {
      area: best.area,
      distanceKm: best.distanceKm,
      etaText: formatEtaText(etaMinutes),
      routeCoordinates: route,
      source: 'dijkstra' as const,
    };
  }

  useEffect(() => {
    if (!requestStarted || !userLocation || selectedAreaId) {
      return;
    }

    let active = true;
    resolveFastestRoadPlan(userLocation, evacuationAreas)
      .then((plan) => {
        if (!active) {
          return;
        }

        if (plan) {
          setSelectedAreaId(plan.area.id);
          return;
        }

        const fallback = buildFallbackPlan();
        if (fallback) {
          setSelectedAreaId(fallback.area.id);
        }
      })
      .catch(() => {
        if (!active) {
          return;
        }

        const fallback = buildFallbackPlan();
        if (fallback) {
          setSelectedAreaId(fallback.area.id);
        }
      });

    return () => {
      active = false;
    };
  }, [evacuationAreas, requestStarted, selectedAreaId, userLocation]);

  useEffect(() => {
    if (!requestStarted || !userLocation || !selectedArea) {
      setRouteCoordinates([]);
      setRouteDistanceKm(null);
      setRouteEtaText(null);
      setRouteSource(null);
      return;
    }

    let active = true;

    fetchRoadRoute(userLocation, {
      latitude: selectedArea.latitude,
      longitude: selectedArea.longitude,
    })
      .then((road) => {
        if (!active) {
          return;
        }

        setRouteCoordinates(road.routeCoordinates);
        setRouteDistanceKm(road.distanceKm);
        setRouteEtaText(formatEtaText(road.etaMinutes));
        setRouteSource('osrm');
      })
      .catch(() => {
        if (!active) {
          return;
        }

        const fallback = buildFallbackPlan(selectedArea);
        if (fallback) {
          setRouteCoordinates(fallback.routeCoordinates);
          setRouteDistanceKm(fallback.distanceKm);
          setRouteEtaText(fallback.etaText);
          setRouteSource('dijkstra');
        } else {
          setRouteCoordinates([]);
          setRouteDistanceKm(null);
          setRouteEtaText(null);
          setRouteSource(null);
        }
      });

    return () => {
      active = false;
    };
  }, [evacuationAreas, requestStarted, selectedArea, userLocation]);

  const mapHtml = useMemo(() => {
    if (!userLocation) {
      return null;
    }

    return buildLeafletHtml(userLocation, evacuationAreas, selectedAreaId, requestStarted, routeCoordinates);
  }, [evacuationAreas, requestStarted, routeCoordinates, selectedAreaId, userLocation]);

  async function handleUploadProof() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to upload proof.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setProofImageUri(result.assets[0].uri);
    }
  }

  function handleMapMessage(event: WebViewMessageEvent) {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as { type?: string; areaId?: string };
      if (payload.type === 'select-area' && payload.areaId) {
        setSelectedAreaId(payload.areaId);
      }
    } catch {
      // Ignore malformed messages from the map.
    }
  }

  async function handleSubmitRescue() {
    if (!userLocation || !selectedArea || !proofImageUri || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      const locationText = `Lat ${userLocation.latitude.toFixed(6)}, Lng ${userLocation.longitude.toFixed(6)}`;
      await api.post('/reports', {
        reportType: 'rescue',
        incidentType: 'Request Rescue',
        location: locationText,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        evacuationAreaId: selectedArea.id,
        evacuationAreaName: selectedArea.name,
        proofImageUri,
        notes: `Selected evacuation area: ${selectedArea.name}.`,
      });

      Alert.alert('Request submitted', 'Your rescue request has been submitted with image proof.');
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to submit rescue request.';
      Alert.alert('Submit failed', message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !userLocation || !mapHtml) {
    return (
      <View style={st.loadingWrap}>
        <ActivityIndicator size="large" color="#0d3558" />
        <Text style={st.loadingText}>Preparing map...</Text>
      </View>
    );
  }

  return (
    <View style={st.root}>
      <View style={st.header}>
        <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        <Text style={st.headerTitle}>Request Rescue</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={st.mapContainer}>
          <WebView
            style={st.map}
            originWhitelist={['*']}
            source={{ html: mapHtml }}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            startInLoadingState
            onMessage={handleMapMessage}
          />
        </View>

        {requestStarted ? (
          <View style={st.mapBottomActionsWrap}>
            <View style={st.bottomActionRow}>
              <TouchableOpacity style={st.uploadBtn} activeOpacity={0.88} onPress={handleUploadProof}>
                <Text style={st.uploadBtnText}>{proofImageUri ? 'Image Uploaded' : 'Upload Image'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  st.submitBtn,
                  !proofImageUri || !selectedArea || submitting ? st.submitBtnDisabled : null,
                ]}
                activeOpacity={0.88}
                disabled={!proofImageUri || !selectedArea || submitting}
                onPress={handleSubmitRescue}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={st.submitBtnText}>Submit</Text>}
              </TouchableOpacity>
            </View>
            <Text style={st.areaCountText}>Image proof is required before submitting.</Text>
          </View>
        ) : null}

        <View style={st.listWrap}>
          <View style={st.areaCard}>
            <MaterialCommunityIcons name="map-marker" size={20} color="#dc2626" style={{ marginTop: 2 }} />
            <View style={{ marginLeft: 8, flex: 1 }}>
              <Text style={st.areaName}>Your Current Location</Text>
              <Text style={st.areaAddr}>
                {userLocation.latitude.toFixed(5)}°N, {userLocation.longitude.toFixed(5)}°E
              </Text>
            </View>
          </View>

          <View style={st.actionWrap}>
            <TouchableOpacity
              style={st.actionBtn}
              activeOpacity={0.88}
              onPress={() => {
                if (requestStarted) {
                  setRequestStarted(false);
                  setSelectedAreaId(null);
                  setProofImageUri(null);
                  setRouteCoordinates([]);
                  setRouteDistanceKm(null);
                  setRouteEtaText(null);
                  setRouteSource(null);
                  return;
                }

                setRequestStarted(true);
                Alert.alert('Rescue request started', 'Select an evacuation area pin on the map to continue.');
              }}
            >
              <Text style={st.actionText}>{requestStarted ? 'Cancel' : 'Send Rescue Request'}</Text>
            </TouchableOpacity>
          </View>

          {requestStarted ? (
            <>
              <Text style={st.areaSectionTitle}>Evacuation Areas</Text>
              <Text style={st.areaCountText}>Tap a map marker to select an evacuation area.</Text>

              {selectedArea ? (
                <View style={[st.areaCard, st.areaCardSelected]}>
                  <MaterialCommunityIcons name="home-city" size={20} color="#15803d" style={{ marginTop: 2 }} />
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text style={st.areaName}>{selectedArea.name}</Text>
                    <Text style={st.areaMetaLabel}>Barangay:</Text>
                    <Text style={st.areaAddr}>{selectedArea.barangay}</Text>
                    <Text style={st.areaMetaLabel}>Place Type:</Text>
                    <Text style={st.areaAddr}>{selectedArea.placeType}</Text>
                    <Text style={st.areaMetaLabel}>Exact Location:</Text>
                    <Text style={st.areaAddr}>{selectedArea.locationText}</Text>
                    <Text style={st.areaMetaLabel}>Capacity:</Text>
                    <Text style={st.areaAddr}>{selectedArea.capacity}</Text>
                    <Text style={st.areaMetaLabel}>Evacuees:</Text>
                    <Text style={st.areaAddr}>{selectedArea.evacuees}</Text>
                    <Text style={st.areaMetaLabel}>Route Distance:</Text>
                    <Text style={st.areaAddr}>{routeDistanceKm ? `${routeDistanceKm.toFixed(2)} km` : 'Calculating...'}</Text>
                    <Text style={st.areaMetaLabel}>ETA:</Text>
                    <Text style={st.areaAddr}>{routeEtaText || 'Calculating...'}</Text>
                    <Text style={st.areaMetaLabel}>Route Type:</Text>
                    <Text style={st.areaAddr}>
                      {routeSource === 'osrm'
                        ? 'Car road route'
                        : routeSource === 'dijkstra'
                          ? 'Fallback shortest path'
                          : 'Calculating...'}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={st.areaHintCard}>
                  <Text style={st.areaHintText}>No evacuation area selected yet.</Text>
                </View>
              )}
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e5e7eb' },
  loadingWrap: { flex: 1, backgroundColor: '#eef2f7', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#475569', marginTop: 10, fontSize: 13, fontWeight: '600' },

  header: {
    backgroundColor: '#0d3558', paddingTop: 48, paddingBottom: 14, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginLeft: 10 },

  mapContainer: {
    marginHorizontal: 14, marginTop: 10, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#cbd5e1', height: 360, backgroundColor: '#fff',
  },
  map: { flex: 1 },
  mapBottomActionsWrap: { paddingHorizontal: 14, marginTop: 8 },

  listWrap: { paddingHorizontal: 14, marginTop: 12 },
  areaSectionTitle: { color: '#0f2948', fontSize: 14, fontWeight: '800', marginBottom: 8 },
  areaCountText: { color: '#475569', fontSize: 11, fontWeight: '600', marginBottom: 8 },
  areaCard: {
    backgroundColor: '#ffffff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12,
    marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  areaCardSelected: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  areaName: { color: '#0f2948', fontSize: 14, fontWeight: '800' },
  areaMetaLabel: { color: '#0f2948', fontSize: 11, marginTop: 5, fontWeight: '700' },
  areaAddr: { color: '#475569', fontSize: 12, marginTop: 2 },
  areaBestTag: { color: '#15803d', fontSize: 11, marginTop: 4, fontWeight: '700' },
  areaHintCard: {
    backgroundColor: '#ecfeff',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  areaHintText: { color: '#0f2948', fontSize: 11, fontWeight: '600' },

  actionWrap: { paddingHorizontal: 14, marginTop: 2 },
  actionBtn: {
    backgroundColor: '#0d3558',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  actionText: { color: '#fff', fontSize: 18, fontWeight: '900' },

  bottomActionRow: { flexDirection: 'row', marginTop: 10, gap: 8 },
  uploadBtn: {
    flex: 1,
    backgroundColor: '#0369a1',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  uploadBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  submitBtn: {
    flex: 1,
    backgroundColor: '#15803d',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  submitBtnDisabled: { backgroundColor: '#94a3b8' },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
