export type AlertItem = {
  id: number;
  title: string;
  body: string;
  category: string;
  severity: string;
  created_at: string;
};

export type AnnouncementItem = {
  id: number;
  title: string;
  body: string;
  created_at: string;
};

export type EvacuationAreaItem = {
  id: number;
  name: string;
  barangay: string;
  place_type?: string | null;
  address?: string | null;
  latitude: number;
  longitude: number;
  capacity: number;
  evacuees: number;
  is_active: boolean;
  created_at: string;
};

export type DashboardIncident = {
  caseId: string;
  type: string;
  location: string;
  status: string;
  title: string;
  createdAt: string;
  imageBase64?: string | null;
};

export type DashboardSummary = {
  cards: {
    emergencyAlerts: number;
    activeTeams: number;
    evacuationAreas: number;
    totalEvacuees: number;
  };
  incidents: DashboardIncident[];
};

export type AdminAccount = {
  id: number;
  admin_id?: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  contact_number: string | null;
  role: string;
  created_at: string;
};

export type MonitoringReport = {
  id: number;
  report_code: string;
  report_type: 'fire' | 'flood' | 'rescue';
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  incident_type: string;
  water_level?: string | null;
  are_people_trapped?: boolean | null;
  estimated_people?: number | null;
  notes?: string | null;
  image_base64?: string | null;
  status: string;
  created_at: string;
  reporter_id: number;
  first_name?: string | null;
  last_name?: string | null;
  contact_number?: string | null;
  email?: string | null;
};
