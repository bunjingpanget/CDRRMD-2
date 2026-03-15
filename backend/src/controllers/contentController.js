const pool = require('../config/db');

async function getAlerts(req, res) {
  const result = await pool.query(
    'SELECT id, title, body, category, severity, created_at FROM alerts ORDER BY created_at DESC LIMIT 50',
  );
  return res.json(result.rows);
}

async function createAlert(req, res) {
  const { title, body, category, severity } = req.body;
  if (!title || !body) {
    return res.status(400).json({ message: 'Title and body are required.' });
  }

  const result = await pool.query(
    `INSERT INTO alerts (title, body, category, severity, posted_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, body, category, severity, created_at`,
    [title, body, category || 'general', severity || 'medium', req.user.userId],
  );

  return res.status(201).json(result.rows[0]);
}

async function getAnnouncements(req, res) {
  const result = await pool.query(
    'SELECT id, title, body, created_at FROM announcements ORDER BY created_at DESC LIMIT 50',
  );
  return res.json(result.rows);
}

async function createAnnouncement(req, res) {
  const { title, body } = req.body;
  if (!title || !body) {
    return res.status(400).json({ message: 'Title and body are required.' });
  }

  const result = await pool.query(
    `INSERT INTO announcements (title, body, posted_by)
     VALUES ($1, $2, $3)
     RETURNING id, title, body, created_at`,
    [title, body, req.user.userId],
  );

  return res.status(201).json(result.rows[0]);
}

async function getEvacuationAreas(req, res) {
  const result = await pool.query(
    `SELECT id, name, barangay, place_type, address, latitude, longitude, capacity, evacuees, is_active, created_at
     FROM evacuation_areas
     ORDER BY name ASC`,
  );
  return res.json(result.rows);
}

async function createEvacuationArea(req, res) {
  const { name, barangay, placeType, address, capacity, evacuees, latitude, longitude } = req.body || {};

  if (!name || !barangay) {
    return res.status(400).json({ message: 'Name and barangay are required.' });
  }

  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ message: 'Latitude and longitude must be valid numbers.' });
  }

  const cap = Math.max(0, Number(capacity || 0));
  const evac = Math.max(0, Number(evacuees || 0));

  const result = await pool.query(
    `INSERT INTO evacuation_areas (name, barangay, place_type, address, latitude, longitude, capacity, evacuees, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
     RETURNING id, name, barangay, place_type, address, latitude, longitude, capacity, evacuees, is_active, created_at`,
    [
      String(name).trim(),
      String(barangay).trim(),
      String(placeType || '').trim() || null,
      String(address || '').trim() || null,
      lat,
      lon,
      cap,
      evac,
    ],
  );

  return res.status(201).json(result.rows[0]);
}

async function updateEvacuationArea(req, res) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid evacuation area id.' });
  }

  const { name, barangay, placeType, address, capacity, evacuees, latitude, longitude, isActive } = req.body || {};
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ message: 'Latitude and longitude must be valid numbers.' });
  }

  const result = await pool.query(
    `UPDATE evacuation_areas
     SET
       name = $1,
       barangay = $2,
       place_type = $3,
       address = $4,
       latitude = $5,
       longitude = $6,
       capacity = $7,
       evacuees = $8,
       is_active = $9
     WHERE id = $10
     RETURNING id, name, barangay, place_type, address, latitude, longitude, capacity, evacuees, is_active, created_at`,
    [
      String(name || '').trim(),
      String(barangay || '').trim(),
      String(placeType || '').trim() || null,
      String(address || '').trim() || null,
      lat,
      lon,
      Math.max(0, Number(capacity || 0)),
      Math.max(0, Number(evacuees || 0)),
      Boolean(isActive ?? true),
      id,
    ],
  );

  const updated = result.rows[0];
  if (!updated) {
    return res.status(404).json({ message: 'Evacuation area not found.' });
  }

  return res.json(updated);
}

async function deleteEvacuationArea(req, res) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid evacuation area id.' });
  }

  const result = await pool.query('DELETE FROM evacuation_areas WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ message: 'Evacuation area not found.' });
  }

  return res.status(204).send();
}

async function getDashboardSummary(req, res) {
  const [rescueAlertsRes, activeTeamsRes, areasRes, evacueesRes, latestAlertsRes, latestReportsRes] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS count FROM incident_reports WHERE report_type = 'rescue'`),
    pool.query(
      `SELECT COUNT(DISTINCT posted_by)::int AS count
       FROM (
         SELECT posted_by FROM alerts WHERE posted_by IS NOT NULL
         UNION ALL
         SELECT posted_by FROM announcements WHERE posted_by IS NOT NULL
         UNION ALL
         SELECT reported_by AS posted_by FROM incident_reports WHERE reported_by IS NOT NULL
       ) active_posts`,
    ),
    pool.query('SELECT COUNT(*)::int AS count FROM evacuation_areas WHERE is_active = TRUE'),
    pool.query('SELECT COALESCE(SUM(evacuees), 0)::int AS total FROM evacuation_areas WHERE is_active = TRUE'),
    pool.query(
      `SELECT id, title, category, severity, created_at
       FROM alerts
       ORDER BY created_at DESC
       LIMIT 20`,
    ),
    pool.query(
      `SELECT
         report_code,
         report_type,
         incident_type,
         location,
         status,
         image_base64,
         created_at
       FROM incident_reports
       ORDER BY created_at DESC
       LIMIT 30`,
    ),
  ]);

  const reportIncidents = latestReportsRes.rows.map((item) => ({
    caseId: item.report_code,
    type: item.report_type || item.incident_type || 'incident',
    location: item.location || 'Calamba City',
    status: item.report_type === 'rescue' ? (item.status || 'pending') : '',
    title: item.incident_type || item.report_type || 'Incident Report',
    createdAt: item.created_at,
    imageBase64: item.image_base64 || null,
  }));

  const alertIncidents = latestAlertsRes.rows.map((item, index) => ({
    caseId: `ALR-${String(index + 1).padStart(3, '0')}`,
    type: item.category || 'general',
    location: 'Calamba City',
    status: item.severity || 'medium',
    title: item.title,
    createdAt: item.created_at,
    imageBase64: null,
  }));

  const incidents = [...reportIncidents, ...alertIncidents]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 30);

  return res.json({
    cards: {
      emergencyAlerts: rescueAlertsRes.rows[0]?.count ?? 0,
      activeTeams: activeTeamsRes.rows[0]?.count ?? 0,
      evacuationAreas: areasRes.rows[0]?.count ?? 0,
      totalEvacuees: evacueesRes.rows[0]?.total ?? 0,
    },
    incidents,
  });
}

module.exports = {
  getAlerts,
  createAlert,
  getAnnouncements,
  createAnnouncement,
  getEvacuationAreas,
  createEvacuationArea,
  updateEvacuationArea,
  deleteEvacuationArea,
  getDashboardSummary,
};
