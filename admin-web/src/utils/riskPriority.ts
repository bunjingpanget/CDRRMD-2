import type { EvacuationAreaItem, MonitoringReport } from '../types';

type HazardFeature = {
  properties?: {
    barangay_name?: string;
    flood_risk_level?: string;
  };
};

type IncidentLike = Pick<MonitoringReport, 'location' | 'status' | 'evacuation_area_name'>;

export type BarangayRiskPriority = {
  barangayKey: string;
  barangayName: string;
  floodHazardLabel: 'Low' | 'Moderate' | 'High';
  floodHazardScore: 1 | 2 | 3;
  evacuationUsagePct: number;
  evacuationStressScore: 1 | 2 | 3;
  activeIncidentCount: number;
  activeIncidentScore: 1 | 2 | 3;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  alertMessage: string | null;
};

const ACTIVE_STATUSES = new Set(['pending', 'accepted', 'in_progress']);

function normalizeKey(value?: string | null) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function toDisplayName(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

function floodHazardScore(value?: string | null): 1 | 2 | 3 {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'high') {
    return 3;
  }
  if (normalized === 'moderate' || normalized === 'medium') {
    return 2;
  }
  return 1;
}

function floodHazardLabel(score: 1 | 2 | 3): 'Low' | 'Moderate' | 'High' {
  if (score === 3) {
    return 'High';
  }
  if (score === 2) {
    return 'Moderate';
  }
  return 'Low';
}

function evacuationStressScore(usagePct: number): 1 | 2 | 3 {
  if (usagePct >= 81) {
    return 3;
  }
  if (usagePct >= 51) {
    return 2;
  }
  return 1;
}

function incidentScore(count: number): 1 | 2 | 3 {
  if (count >= 6) {
    return 3;
  }
  if (count >= 3) {
    return 2;
  }
  return 1;
}

function classifyRisk(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (score >= 2.5) {
    return 'HIGH';
  }
  if (score >= 1.5) {
    return 'MEDIUM';
  }
  return 'LOW';
}

function isActiveIncident(status?: string | null) {
  return ACTIVE_STATUSES.has(String(status || '').toLowerCase());
}

function inferIncidentBarangayKey(
  incident: IncidentLike,
  areaNameToBarangay: Map<string, string>,
  knownBarangayKeys: string[],
) {
  const byAreaName = normalizeKey(incident.evacuation_area_name);
  if (byAreaName && areaNameToBarangay.has(byAreaName)) {
    return areaNameToBarangay.get(byAreaName) || null;
  }

  const location = normalizeKey(incident.location);
  if (!location) {
    return null;
  }

  const explicitMatch = location.match(/barangay\s+([a-z0-9\s]+)/i);
  if (explicitMatch) {
    const explicitKey = normalizeKey(explicitMatch[1]);
    const matching = knownBarangayKeys.find((key) => explicitKey.includes(key) || key.includes(explicitKey));
    if (matching) {
      return matching;
    }
  }

  const sortedKeys = [...knownBarangayKeys].sort((a, b) => b.length - a.length);
  const inclusiveMatch = sortedKeys.find((key) => location.includes(key));
  return inclusiveMatch || null;
}

export function computeRiskPriority(
  evacuationAreas: EvacuationAreaItem[],
  incidents: IncidentLike[],
  hazardFeatures: HazardFeature[],
): BarangayRiskPriority[] {
  const hazardScoreByBarangay = new Map<string, 1 | 2 | 3>();
  const displayNameByBarangay = new Map<string, string>();

  hazardFeatures.forEach((feature) => {
    const key = normalizeKey(feature.properties?.barangay_name);
    if (!key) {
      return;
    }

    const score = floodHazardScore(feature.properties?.flood_risk_level);
    hazardScoreByBarangay.set(key, score);
    displayNameByBarangay.set(key, String(feature.properties?.barangay_name || toDisplayName(key)));
  });

  const usageByBarangay = new Map<string, { evacuees: number; capacity: number }>();
  const areaNameToBarangay = new Map<string, string>();

  evacuationAreas.forEach((area) => {
    const barangayKey = normalizeKey(area.barangay);
    if (!barangayKey) {
      return;
    }

    const existing = usageByBarangay.get(barangayKey) || { evacuees: 0, capacity: 0 };
    existing.evacuees += Number(area.evacuees || 0);
    existing.capacity += Number(area.capacity || 0);
    usageByBarangay.set(barangayKey, existing);

    const areaNameKey = normalizeKey(area.name);
    if (areaNameKey) {
      areaNameToBarangay.set(areaNameKey, barangayKey);
    }

    if (!displayNameByBarangay.has(barangayKey)) {
      displayNameByBarangay.set(barangayKey, String(area.barangay || toDisplayName(barangayKey)));
    }

    if (!hazardScoreByBarangay.has(barangayKey)) {
      hazardScoreByBarangay.set(barangayKey, 1);
    }
  });

  const knownBarangayKeys = Array.from(displayNameByBarangay.keys());
  const incidentCountByBarangay = new Map<string, number>();

  incidents
    .filter((incident) => isActiveIncident(incident.status))
    .forEach((incident) => {
      const key = inferIncidentBarangayKey(incident, areaNameToBarangay, knownBarangayKeys);
      if (!key) {
        return;
      }
      incidentCountByBarangay.set(key, (incidentCountByBarangay.get(key) || 0) + 1);
    });

  const allBarangays = Array.from(new Set([...knownBarangayKeys, ...hazardScoreByBarangay.keys()]));

  return allBarangays
    .map((barangayKey) => {
      const floodScore = hazardScoreByBarangay.get(barangayKey) || 1;
      const usage = usageByBarangay.get(barangayKey) || { evacuees: 0, capacity: 0 };
      const usagePct = usage.capacity > 0 ? (usage.evacuees / usage.capacity) * 100 : 0;
      const stressScore = evacuationStressScore(usagePct);
      const activeIncidents = incidentCountByBarangay.get(barangayKey) || 0;
      const activeScore = incidentScore(activeIncidents);

      const riskScore = Number((floodScore * 0.5 + stressScore * 0.3 + activeScore * 0.2).toFixed(2));
      const riskLevel = classifyRisk(riskScore);
      const alertMessage = riskLevel === 'HIGH' && usagePct >= 85
        ? `⚠ Barangay ${displayNameByBarangay.get(barangayKey) || toDisplayName(barangayKey)} is HIGH RISK due to severe flood hazard and near-full evacuation capacity.`
        : null;

      return {
        barangayKey,
        barangayName: displayNameByBarangay.get(barangayKey) || toDisplayName(barangayKey),
        floodHazardLabel: floodHazardLabel(floodScore),
        floodHazardScore: floodScore,
        evacuationUsagePct: Number(usagePct.toFixed(1)),
        evacuationStressScore: stressScore,
        activeIncidentCount: activeIncidents,
        activeIncidentScore: activeScore,
        riskScore,
        riskLevel,
        alertMessage,
      } satisfies BarangayRiskPriority;
    })
    .sort((a, b) => b.riskScore - a.riskScore || a.barangayName.localeCompare(b.barangayName));
}
