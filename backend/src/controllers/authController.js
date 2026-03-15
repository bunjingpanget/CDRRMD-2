const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function register(req, res) {
  const { username, email, password, firstName, lastName, address, contactNumber } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const trimmedEmail = String(email).trim().toLowerCase();
  if (!trimmedEmail.includes('@')) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [trimmedEmail]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ message: 'Email already exists.' });
  }

  const rawUsername = String(username || '').trim();
  const finalUsername = rawUsername.length > 0 ? rawUsername : trimmedEmail.split('@')[0];

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
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
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, username, email, first_name, last_name, address, contact_number, role`,
    [
      finalUsername,
      trimmedEmail,
      String(firstName || '').trim() || null,
      String(lastName || '').trim() || null,
      String(address || '').trim() || null,
      String(contactNumber || '').trim() || null,
      passwordHash,
      'user',
    ],
  );

  const user = result.rows[0];

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );

  return res.status(201).json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      address: user.address,
      contactNumber: user.contact_number,
    },
  });
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const normalizedIdentifier = String(email).trim();
  if (!normalizedIdentifier) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  let result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [normalizedIdentifier]);

  if (result.rows.length === 0) {
    result = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [normalizedIdentifier]);
  }

  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  // Gracefully handle legacy rows that may not have a password hash.
  if (!user.password_hash || typeof user.password_hash !== 'string') {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      address: user.address,
      contactNumber: user.contact_number,
    },
  });
}

async function me(req, res) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Invalid token payload.' });
  }

  const result = await pool.query(
    `SELECT id, username, email, first_name, last_name, address, contact_number, role
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );

  const user = result.rows[0];
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      address: user.address,
      contactNumber: user.contact_number,
    },
  });
}

async function updateMe(req, res) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Invalid token payload.' });
  }

  const { firstName, lastName, email, address, contactNumber } = req.body || {};

  const nextEmail = String(email || '').trim().toLowerCase() || null;
  if (nextEmail && !nextEmail.includes('@')) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }

  if (nextEmail) {
    const duplicate = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1',
      [nextEmail, userId],
    );

    if (duplicate.rows.length > 0) {
      return res.status(409).json({ message: 'Email already exists.' });
    }
  }

  const result = await pool.query(
    `UPDATE users
     SET
       first_name = $1,
       last_name = $2,
       email = $3,
       address = $4,
       contact_number = $5
     WHERE id = $6
     RETURNING id, username, role, email, first_name, last_name, address, contact_number`,
    [
      String(firstName || '').trim() || null,
      String(lastName || '').trim() || null,
      nextEmail,
      String(address || '').trim() || null,
      String(contactNumber || '').trim() || null,
      userId,
    ],
  );

  const user = result.rows[0];
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      address: user.address,
      contactNumber: user.contact_number,
    },
  });
}

module.exports = { login, register, me, updateMe };
