const bcrypt = require('bcryptjs');
const pool = require('./db');

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(80) NOT NULL,
      email VARCHAR(160),
      first_name VARCHAR(120),
      last_name VARCHAR(120),
      address TEXT,
      contact_number VARCHAR(40),
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'admin',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id SERIAL PRIMARY KEY,
      title VARCHAR(160) NOT NULL,
      body TEXT NOT NULL,
      category VARCHAR(60) NOT NULL DEFAULT 'general',
      severity VARCHAR(20) NOT NULL DEFAULT 'medium',
      posted_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      title VARCHAR(160) NOT NULL,
      body TEXT NOT NULL,
      posted_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS evacuation_areas (
      id SERIAL PRIMARY KEY,
      name VARCHAR(180) NOT NULL,
      barangay VARCHAR(120) NOT NULL,
      place_type VARCHAR(120),
      address TEXT,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 0,
      evacuees INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS incident_reports (
      id SERIAL PRIMARY KEY,
      report_code VARCHAR(40) NOT NULL DEFAULT '',
      report_type VARCHAR(20) NOT NULL,
      location TEXT NOT NULL,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      incident_type VARCHAR(120) NOT NULL,
      water_level VARCHAR(60),
      are_people_trapped BOOLEAN,
      estimated_people INTEGER,
      notes TEXT,
      image_base64 TEXT,
      reported_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email VARCHAR(160);

    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS first_name VARCHAR(120);

    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_name VARCHAR(120);

    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS address TEXT;

    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS contact_number VARCHAR(40);

    ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_username_key;

    ALTER TABLE evacuation_areas
    ADD COLUMN IF NOT EXISTS place_type VARCHAR(120);

    ALTER TABLE evacuation_areas
    ADD COLUMN IF NOT EXISTS address TEXT;

    ALTER TABLE incident_reports
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;

    ALTER TABLE incident_reports
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

    CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
    ON users (LOWER(email))
    WHERE email IS NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS incident_reports_report_code_unique_idx
    ON incident_reports (report_code)
    WHERE report_code <> '';

  `);

  await pool.query(
     `INSERT INTO evacuation_areas (name, barangay, place_type, address, latitude, longitude, capacity, evacuees, is_active)
      SELECT seed.name, seed.barangay, seed.place_type, seed.address, seed.latitude, seed.longitude, seed.capacity, seed.evacuees, seed.is_active
     FROM (
      VALUES
        ('Bagong Kalsada Covered Court', 'Bagong Kalsada', 'Covered Court', 'Bagong Kalsada Covered Court, Barangay Bagong Kalsada, Calamba City, Laguna, Philippines', 14.2148, 121.1520, 120, 0, TRUE),
        ('Bagong Kalsada Elementary School', 'Bagong Kalsada', 'Elementary School', 'Bagong Kalsada Elementary School, Barangay Bagong Kalsada, Calamba City, Laguna, Philippines', 14.2160, 121.1539, 161, 0, TRUE),
        ('Bagong Kalsada Multi-purpose Hall', 'Bagong Kalsada', 'Multi-purpose Hall', 'Bagong Kalsada Multi-purpose Hall, Barangay Bagong Kalsada, Calamba City, Laguna, Philippines', 14.2134, 121.1504, 202, 0, TRUE),
        ('Banyadero Covered Court', 'Banyadero', 'Covered Court', 'Banyadero Covered Court, Barangay Banyadero, Calamba City, Laguna, Philippines', 14.2024, 121.1692, 139, 0, TRUE),
        ('Mayapa Covered Court', 'Mayapa', 'Covered Court', 'Mayapa Covered Court, Barangay Mayapa, Calamba City, Laguna, Philippines', 14.2069, 121.1395, 186, 0, TRUE),
        ('Canlubang Elementary School', 'Canlubang', 'Elementary School', 'Canlubang Elementary School, Barangay Canlubang, Calamba City, Laguna, Philippines', 14.2308, 121.0920, 175, 0, TRUE),
        ('Parian Multi-purpose Hall', 'Parian', 'Multi-purpose Hall', 'Parian Multi-purpose Hall, Barangay Parian, Calamba City, Laguna, Philippines', 14.2078, 121.1688, 198, 0, TRUE),
        ('Real Covered Court', 'Real', 'Covered Court', 'Real Covered Court, Barangay Real, Calamba City, Laguna, Philippines', 14.2076, 121.1616, 148, 0, TRUE),
        ('Saimsim Elementary School', 'Saimsim', 'Elementary School', 'Saimsim Elementary School, Barangay Saimsim, Calamba City, Laguna, Philippines', 14.1933, 121.1434, 166, 0, TRUE)
      ) AS seed(name, barangay, place_type, address, latitude, longitude, capacity, evacuees, is_active)
     WHERE NOT EXISTS (
       SELECT 1 FROM evacuation_areas ea WHERE LOWER(ea.name) = LOWER(seed.name)
     )`,
  );

  const username = 'admin';
  const email = 'admin@cddrmd.local';
  const password = 'Admin@123';

  const existingByEmail = await pool.query(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1) ORDER BY id ASC LIMIT 1',
    [email],
  );
  const existingByUsername = await pool.query(
    'SELECT id FROM users WHERE LOWER(username) = LOWER($1) ORDER BY id ASC LIMIT 1',
    [username],
  );

  const adminSeedId = existingByEmail.rows[0]?.id || existingByUsername.rows[0]?.id || null;

  if (!adminSeedId) {
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      [username, email, passwordHash, 'admin'],
    );
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      `UPDATE users
       SET
         username = COALESCE(username, $1),
         email = COALESCE(email, $2),
         password_hash = COALESCE(password_hash, $3),
         role = COALESCE(role, 'admin')
       WHERE id = $4`,
      [username, email, passwordHash, adminSeedId],
    );
  }

  const secondaryAdminUsername = 'cdrrmd_admin';
  const secondaryAdminEmail = 'cdrrmd.admin@calamba.gov.ph';
  const secondaryAdminPasswordHash = await bcrypt.hash(password, 10);
  const secondaryAdminExisting = await pool.query(
    `SELECT id
     FROM users
     WHERE username = $1 OR LOWER(email) = LOWER($2)
     ORDER BY id ASC
     LIMIT 1`,
    [secondaryAdminUsername, secondaryAdminEmail],
  );

  if (secondaryAdminExisting.rows.length === 0) {
    await pool.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')`,
      [secondaryAdminUsername, secondaryAdminEmail, secondaryAdminPasswordHash],
    );
  } else {
    await pool.query(
      `UPDATE users
       SET
         username = COALESCE(username, $1),
         email = COALESCE(email, $2),
         password_hash = COALESCE(password_hash, $3),
         role = 'admin'
       WHERE id = $4`,
      [secondaryAdminUsername, secondaryAdminEmail, secondaryAdminPasswordHash, secondaryAdminExisting.rows[0].id],
    );
  }
}

module.exports = initDb;
