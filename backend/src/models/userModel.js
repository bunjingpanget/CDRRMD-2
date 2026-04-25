const pool = require('../config/db');

async function findUserByEmail(email) {
  const result = await pool.query(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND COALESCE(is_archived, FALSE) = FALSE',
    [email],
  );
  return result.rows[0] || null;
}

async function findUserByUsername(username) {
  const result = await pool.query(
    'SELECT * FROM users WHERE LOWER(username) = LOWER($1) AND COALESCE(is_archived, FALSE) = FALSE',
    [username],
  );
  return result.rows[0] || null;
}

async function findPublicUserById(id) {
  const result = await pool.query(
    `SELECT id, username, email, first_name, last_name, address, contact_number, role
     FROM users
     WHERE id = $1
       AND COALESCE(is_archived, FALSE) = FALSE
     LIMIT 1`,
    [id],
  );
  return result.rows[0] || null;
}

async function createUser(user) {
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
      user.username,
      user.email,
      user.firstName,
      user.lastName,
      user.address,
      user.contactNumber,
      user.passwordHash,
      user.role,
    ],
  );

  return result.rows[0];
}

async function updateMyProfile(userId, profile) {
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
    [profile.firstName, profile.lastName, profile.email, profile.address, profile.contactNumber, userId],
  );

  return result.rows[0] || null;
}

async function findDuplicateEmailForUser(email, userId) {
  const result = await pool.query(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1',
    [email, userId],
  );
  return result.rows[0] || null;
}

async function listAdmins() {
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
            created_at,
            COALESCE(is_active, FALSE) AS is_active,
            last_login
     FROM users
     WHERE role = 'admin'
       AND COALESCE(is_archived, FALSE) = FALSE
     ORDER BY id ASC`,
  );
  return result.rows;
}

async function listUsers() {
  const result = await pool.query(
    `SELECT id,
            CONCAT('USR-', EXTRACT(YEAR FROM created_at)::text, '-', LPAD(id::text, 5, '0')) AS user_id,
            username,
            email,
            first_name,
            last_name,
            address,
            contact_number,
            role,
            created_at
     FROM users
     WHERE role = 'user'
       AND COALESCE(is_archived, FALSE) = FALSE
     ORDER BY id ASC`,
  );
  return result.rows;
}

async function listArchivedAdmins() {
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
            created_at,
            archived_at
     FROM users
     WHERE role = 'admin'
       AND COALESCE(is_archived, FALSE) = TRUE
     ORDER BY archived_at DESC NULLS LAST, id DESC`,
  );
  return result.rows;
}

async function listArchivedUsers() {
  const result = await pool.query(
    `SELECT id,
            CONCAT('USR-', EXTRACT(YEAR FROM created_at)::text, '-', LPAD(id::text, 5, '0')) AS user_id,
            username,
            email,
            first_name,
            last_name,
            address,
            contact_number,
            role,
            created_at,
            archived_at
     FROM users
     WHERE role = 'user'
       AND COALESCE(is_archived, FALSE) = TRUE
     ORDER BY archived_at DESC NULLS LAST, id DESC`,
  );
  return result.rows;
}

async function findDuplicateAdmin(email, username, ignoreId = null) {
  if (ignoreId) {
    const result = await pool.query(
      `SELECT id
       FROM users
       WHERE (LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2))
         AND id <> $3
       LIMIT 1`,
      [email, username, ignoreId],
    );
    return result.rows[0] || null;
  }

  const result = await pool.query(
    `SELECT id
     FROM users
     WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2)
     LIMIT 1`,
    [email, username],
  );
  return result.rows[0] || null;
}

async function findDuplicateUser(email, username, ignoreId = null) {
  if (ignoreId) {
    const result = await pool.query(
      `SELECT id
       FROM users
       WHERE (LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2))
         AND id <> $3
       LIMIT 1`,
      [email, username, ignoreId],
    );
    return result.rows[0] || null;
  }

  const result = await pool.query(
    `SELECT id
     FROM users
     WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2)
     LIMIT 1`,
    [email, username],
  );
  return result.rows[0] || null;
}

async function createAdmin(admin) {
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
      admin.username,
      admin.email,
      admin.firstName,
      admin.lastName,
      admin.address,
      admin.contactNumber,
      admin.passwordHash,
    ],
  );
  return result.rows[0];
}

async function createUserByAdmin(user) {
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
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'user')
    RETURNING id,
          CONCAT('USR-', EXTRACT(YEAR FROM created_at)::text, '-', LPAD(id::text, 5, '0')) AS user_id,
          username,
          email,
          first_name,
          last_name,
          address,
          contact_number,
          role,
          created_at`,
    [
      user.username,
      user.email,
      user.firstName,
      user.lastName,
      user.address,
      user.contactNumber,
      user.passwordHash,
    ],
  );
  return result.rows[0];
}

async function findAdminById(id) {
  const result = await pool.query(
    `SELECT id
     FROM users
     WHERE id = $1
       AND role = $2
       AND COALESCE(is_archived, FALSE) = FALSE
     LIMIT 1`,
    [id, 'admin'],
  );
  return result.rows[0] || null;
}

async function findUserByIdForAdmin(id) {
  const result = await pool.query(
    `SELECT id
     FROM users
     WHERE id = $1
       AND role = $2
       AND COALESCE(is_archived, FALSE) = FALSE
     LIMIT 1`,
    [id, 'user'],
  );
  return result.rows[0] || null;
}

async function updateAdmin(admin) {
  if (admin.passwordHash) {
    const result = await pool.query(
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
        admin.username,
        admin.email,
        admin.firstName,
        admin.lastName,
        admin.address,
        admin.contactNumber,
        admin.passwordHash,
        admin.id,
      ],
    );
    return result.rows[0] || null;
  }

  const result = await pool.query(
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
    [admin.username, admin.email, admin.firstName, admin.lastName, admin.address, admin.contactNumber, admin.id],
  );
  return result.rows[0] || null;
}

async function updateUserById(user) {
  if (user.passwordHash) {
    const result = await pool.query(
      `UPDATE users
       SET
         username = $1,
         email = $2,
         first_name = $3,
         last_name = $4,
         address = $5,
         contact_number = $6,
         password_hash = $7,
         role = 'user'
       WHERE id = $8
      RETURNING id,
           CONCAT('USR-', EXTRACT(YEAR FROM created_at)::text, '-', LPAD(id::text, 5, '0')) AS user_id,
           username,
           email,
           first_name,
           last_name,
           address,
           contact_number,
           role,
           created_at`,
      [
        user.username,
        user.email,
        user.firstName,
        user.lastName,
        user.address,
        user.contactNumber,
        user.passwordHash,
        user.id,
      ],
    );
    return result.rows[0] || null;
  }

  const result = await pool.query(
    `UPDATE users
     SET
       username = $1,
       email = $2,
       first_name = $3,
       last_name = $4,
       address = $5,
       contact_number = $6,
       role = 'user'
     WHERE id = $7
    RETURNING id,
        CONCAT('USR-', EXTRACT(YEAR FROM created_at)::text, '-', LPAD(id::text, 5, '0')) AS user_id,
        username,
        email,
        first_name,
        last_name,
        address,
        contact_number,
        role,
        created_at`,
    [user.username, user.email, user.firstName, user.lastName, user.address, user.contactNumber, user.id],
  );
  return result.rows[0] || null;
}

async function archiveAdminById(id, archivedBy) {
  const result = await pool.query(
    `UPDATE users
     SET
       is_archived = TRUE,
       archived_at = NOW(),
       archived_by = $2
     WHERE id = $1
       AND role = 'admin'
       AND COALESCE(is_archived, FALSE) = FALSE
     RETURNING id`,
    [id, archivedBy],
  );
  return result.rows[0] || null;
}

async function restoreAdminById(id) {
  const result = await pool.query(
    `UPDATE users
     SET
       is_archived = FALSE,
       archived_at = NULL,
       archived_by = NULL
     WHERE id = $1
       AND role = 'admin'
       AND COALESCE(is_archived, FALSE) = TRUE
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
    [id],
  );
  return result.rows[0] || null;
}

async function permanentlyDeleteAdminById(id) {
  const result = await pool.query(
    `DELETE FROM users
     WHERE id = $1
       AND role = 'admin'
       AND COALESCE(is_archived, FALSE) = TRUE
     RETURNING id`,
    [id],
  );
  return result.rows[0] || null;
}

async function archiveUserById(id, archivedBy) {
  const result = await pool.query(
    `UPDATE users
     SET
       is_archived = TRUE,
       archived_at = NOW(),
       archived_by = $2
     WHERE id = $1
       AND role = 'user'
       AND COALESCE(is_archived, FALSE) = FALSE
     RETURNING id`,
    [id, archivedBy],
  );
  return result.rows[0] || null;
}

async function restoreUserById(id) {
  const result = await pool.query(
    `UPDATE users
     SET
       is_archived = FALSE,
       archived_at = NULL,
       archived_by = NULL
     WHERE id = $1
       AND role = 'user'
       AND COALESCE(is_archived, FALSE) = TRUE
     RETURNING id,
        CONCAT('USR-', EXTRACT(YEAR FROM created_at)::text, '-', LPAD(id::text, 5, '0')) AS user_id,
        username,
        email,
        first_name,
        last_name,
        address,
        contact_number,
        role,
        created_at`,
    [id],
  );
  return result.rows[0] || null;
}

async function permanentlyDeleteUserById(id) {
  const result = await pool.query(
    `DELETE FROM users
     WHERE id = $1
       AND role = 'user'
       AND COALESCE(is_archived, FALSE) = TRUE
     RETURNING id`,
    [id],
  );
  return result.rows[0] || null;
}

async function deleteUserById(id) {
  const result = await pool.query(
    `DELETE FROM users
     WHERE id = $1
       AND role = 'user'
       AND COALESCE(is_archived, FALSE) = FALSE
     RETURNING id`,
    [id],
  );
  return result.rows[0] || null;
}

module.exports = {
  findUserByEmail,
  findUserByUsername,
  findPublicUserById,
  createUser,
  updateMyProfile,
  findDuplicateEmailForUser,
  listAdmins,
  listUsers,
  findDuplicateAdmin,
  findDuplicateUser,
  createAdmin,
  findAdminById,
  findUserByIdForAdmin,
  updateAdmin,
  updateUserById,
  listArchivedAdmins,
  listArchivedUsers,
  archiveAdminById,
  restoreAdminById,
  permanentlyDeleteAdminById,
  createUserByAdmin,
  archiveUserById,
  restoreUserById,
  permanentlyDeleteUserById,
  deleteUserById,
};
