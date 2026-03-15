const pool = require('../config/db');

function buildReportCode(id, createdAt) {
  const year = new Date(createdAt || Date.now()).getFullYear();
  return `RPT-${year}-${String(id).padStart(6, '0')}`;
}

function toBool(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'yes' || normalized === 'true' || normalized === '1') {
    return true;
  }
  if (normalized === 'no' || normalized === 'false' || normalized === '0') {
    return false;
  }
  return null;
}

async function createReport(req, res) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Invalid token payload.' });
  }

  const {
    reportType,
    location,
    latitude,
    longitude,
    incidentType,
    waterLevel,
    arePeopleTrapped,
    estimatedPeople,
    notes,
    imageBase64,
  } = req.body || {};

  const normalizedType = String(reportType || '').trim().toLowerCase();
  if (!['fire', 'flood', 'rescue'].includes(normalizedType)) {
    return res.status(400).json({ message: 'reportType must be fire, flood, or rescue.' });
  }

  const locationText = String(location || '').trim();
  if (!locationText) {
    return res.status(400).json({ message: 'Location is required.' });
  }

  const normalizedIncidentType = String(incidentType || '').trim() || (normalizedType === 'rescue' ? 'Request Rescue' : 'General Incident');
  if (!normalizedIncidentType) {
    return res.status(400).json({ message: 'Incident type is required.' });
  }

  const waterLevelText = normalizedType === 'flood' ? String(waterLevel || '').trim() : null;
  if (normalizedType === 'flood' && !waterLevelText) {
    return res.status(400).json({ message: 'Water level is required for flood reports.' });
  }

  const estimatedPeopleValue = String(estimatedPeople || '').trim();
  const estimatedPeopleInt = estimatedPeopleValue ? Number(estimatedPeopleValue) : null;
  if (estimatedPeopleValue && !Number.isFinite(estimatedPeopleInt)) {
    return res.status(400).json({ message: 'Estimated people must be a number.' });
  }

  const safeImageBase64 = String(imageBase64 || '').trim() || null;
  const lat = latitude === null || latitude === undefined || latitude === '' ? null : Number(latitude);
  const lon = longitude === null || longitude === undefined || longitude === '' ? null : Number(longitude);
  if ((lat !== null && !Number.isFinite(lat)) || (lon !== null && !Number.isFinite(lon))) {
    return res.status(400).json({ message: 'Latitude/longitude must be valid numbers.' });
  }

  const normalizedStatus = normalizedType === 'rescue' ? 'pending' : 'none';

  const inserted = await pool.query(
    `INSERT INTO incident_reports (
      report_code,
      report_type,
      location,
      latitude,
      longitude,
      incident_type,
      water_level,
      are_people_trapped,
      estimated_people,
      notes,
      image_base64,
      reported_by,
      status
    )
    VALUES ('', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id, created_at`,
    [
      normalizedType,
      locationText,
      lat,
      lon,
      normalizedIncidentType,
      waterLevelText,
      toBool(arePeopleTrapped),
      Number.isFinite(estimatedPeopleInt) ? estimatedPeopleInt : null,
      String(notes || '').trim() || null,
      safeImageBase64,
      userId,
      normalizedStatus,
    ],
  );

  const created = inserted.rows[0];
  const reportCode = buildReportCode(created.id, created.created_at);

  const updated = await pool.query(
    `UPDATE incident_reports
     SET report_code = $1
     WHERE id = $2
     RETURNING id, report_code, report_type, location, latitude, longitude, incident_type, water_level, are_people_trapped, estimated_people, notes, image_base64, reported_by, status, created_at`,
    [reportCode, created.id],
  );

  return res.status(201).json(updated.rows[0]);
}

async function getReports(req, res) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  const result = await pool.query(
    `SELECT
      r.id,
      r.report_code,
      r.report_type,
      r.location,
      r.latitude,
      r.longitude,
      r.incident_type,
      r.water_level,
      r.are_people_trapped,
      r.estimated_people,
      r.notes,
      r.image_base64,
      r.status,
      r.created_at,
      u.id AS reporter_id,
      u.first_name,
      u.last_name,
      u.contact_number,
      u.email
     FROM incident_reports r
     JOIN users u ON u.id = r.reported_by
     ORDER BY r.created_at DESC
     LIMIT 200`,
  );

  return res.json(result.rows);
}

module.exports = {
  createReport,
  getReports,
};
