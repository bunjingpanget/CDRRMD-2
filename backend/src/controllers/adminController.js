const bcrypt = require('bcryptjs');
const pool = require('../config/db');

function ensureAdmin(req, res) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required.' });
    return false;
  }
  return true;
}

async function listAdmins(req, res) {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const result = await pool.query(
    `SELECT id,
            CONCAT('ADM-', EXTRACT(YEAR FROM created_at)::text, '-', LPAD(id::text, 5, '0')) AS admin_id,
            username,
            email,
            first_name,
            last_name,
            address,
            contact_number,
            role,
            created_at
     FROM users
     WHERE role = 'admin'
     ORDER BY id ASC`,
  );

  return res.json(result.rows);
}

async function createAdmin(req, res) {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const {
    username,
    email,
    password,
    firstName,
    lastName,
    address,
    contactNumber,
  } = req.body || {};

  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return res.status(400).json({ message: 'Valid email is required.' });
  }

  const finalPassword = String(password || '').trim();
  if (finalPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  const finalUsername = String(username || '').trim() || normalizedEmail.split('@')[0];
  const existing = await pool.query(
    `SELECT id
     FROM users
     WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2)
     LIMIT 1`,
    [normalizedEmail, finalUsername],
  );

  if (existing.rows.length > 0) {
    return res.status(409).json({ message: 'Admin with the same email or username already exists.' });
  }

  const passwordHash = await bcrypt.hash(finalPassword, 10);
  const created = await pool.query(
    `INSERT INTO users (
      username,
      email,
      first_name,
      last_name,
      address,
      contact_number,
      password_hash,
      role
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'admin')
    RETURNING id,
          CONCAT('ADM-', EXTRACT(YEAR FROM created_at)::text, '-', LPAD(id::text, 5, '0')) AS admin_id,
          username,
          email,
          first_name,
          last_name,
          address,
          contact_number,
          role,
          created_at`,
    [
      finalUsername,
      normalizedEmail,
      String(firstName || '').trim() || null,
      String(lastName || '').trim() || null,
      String(address || '').trim() || null,
      String(contactNumber || '').trim() || null,
      passwordHash,
    ],
  );

  return res.status(201).json(created.rows[0]);
}

async function updateAdmin(req, res) {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid admin id.' });
  }

  const {
    username,
    email,
    password,
    firstName,
    lastName,
    address,
    contactNumber,
  } = req.body || {};

  const existing = await pool.query('SELECT id FROM users WHERE id = $1 AND role = $2 LIMIT 1', [id, 'admin']);
  if (existing.rows.length === 0) {
    return res.status(404).json({ message: 'Admin not found.' });
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return res.status(400).json({ message: 'Valid email is required.' });
  }

  const finalUsername = String(username || '').trim();
  if (!finalUsername) {
    return res.status(400).json({ message: 'Username is required.' });
  }

  const duplicate = await pool.query(
    `SELECT id
     FROM users
     WHERE (LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2))
       AND id <> $3
     LIMIT 1`,
    [normalizedEmail, finalUsername, id],
  );

  if (duplicate.rows.length > 0) {
    return res.status(409).json({ message: 'Email or username already exists.' });
  }

  const passwordInput = String(password || '').trim();
  const hasPasswordUpdate = passwordInput.length > 0;
  if (hasPasswordUpdate && passwordInput.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  if (hasPasswordUpdate) {
    const passwordHash = await bcrypt.hash(passwordInput, 10);
    const updated = await pool.query(
      `UPDATE users
       SET
         username = $1,
         email = $2,
         first_name = $3,
         last_name = $4,
         address = $5,
         contact_number = $6,
         password_hash = $7,
         role = 'admin'
       WHERE id = $8
      RETURNING id,
           CONCAT('ADM-', EXTRACT(YEAR FROM created_at)::text, '-', LPAD(id::text, 5, '0')) AS admin_id,
           username,
           email,
           first_name,
           last_name,
           address,
           contact_number,
           role,
           created_at`,
      [
        finalUsername,
        normalizedEmail,
        String(firstName || '').trim() || null,
        String(lastName || '').trim() || null,
        String(address || '').trim() || null,
        String(contactNumber || '').trim() || null,
        passwordHash,
        id,
      ],
    );

    return res.json(updated.rows[0]);
  }

  const updated = await pool.query(
    `UPDATE users
     SET
       username = $1,
       email = $2,
       first_name = $3,
       last_name = $4,
       address = $5,
       contact_number = $6,
       role = 'admin'
     WHERE id = $7
    RETURNING id,
        CONCAT('ADM-', EXTRACT(YEAR FROM created_at)::text, '-', LPAD(id::text, 5, '0')) AS admin_id,
        username,
        email,
        first_name,
        last_name,
        address,
        contact_number,
        role,
        created_at`,
    [
      finalUsername,
      normalizedEmail,
      String(firstName || '').trim() || null,
      String(lastName || '').trim() || null,
      String(address || '').trim() || null,
      String(contactNumber || '').trim() || null,
      id,
    ],
  );

  return res.json(updated.rows[0]);
}

async function deleteAdmin(req, res) {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Invalid admin id.' });
  }

  if (req.user?.userId === id) {
    return res.status(400).json({ message: 'You cannot delete your own account.' });
  }

  const removed = await pool.query('DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id', [id, 'admin']);
  if (removed.rows.length === 0) {
    return res.status(404).json({ message: 'Admin not found.' });
  }

  return res.status(204).send();
}

module.exports = {
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
};
