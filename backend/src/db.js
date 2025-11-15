const { Pool } = require("pg");

const CANVAS_SOURCE = "canvas";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn(
    "[db] DATABASE_URL is not set. Example: postgres://ontime:changeme@localhost:5432/ontime"
  );
}

const pool = new Pool({ connectionString });

async function findUserByEmail(email) {
  const q =
    "SELECT id, email, password_hash, name, created_at FROM users WHERE lower(email) = lower($1) LIMIT 1";
  const { rows } = await pool.query(q, [email]);
  return rows[0] || null;
}

async function createUser({ email, passwordHash, name }) {
  const q = `INSERT INTO users (email, password_hash, name)
             VALUES ($1, $2, $3)
             RETURNING id, email, name, created_at`;
  const { rows } = await pool.query(q, [email, passwordHash, name || null]);
  return rows[0];
}

async function listReminders(userId) {
  const q = `SELECT id, user_id, title, description, due_at, source, source_id, is_completed, created_at, updated_at
             FROM reminders
             WHERE user_id = $1
             ORDER BY due_at ASC, id ASC`;
  const { rows } = await pool.query(q, [userId]);
  return rows;
}

async function createReminder({
  userId,
  title,
  description,
  dueAt,
  source,
  sourceId,
  isCompleted = false,
}) {
  const q = `INSERT INTO reminders (user_id, title, description, due_at, source, source_id, is_completed)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, user_id, title, description, due_at, source, source_id, is_completed, created_at, updated_at`;
  const params = [
    userId,
    title,
    description || null,
    dueAt,
    source || null,
    sourceId || null,
    isCompleted,
  ];
  const { rows } = await pool.query(q, params);
  return rows[0];
}

async function updateReminder({ userId, reminderId, updates }) {
  const allowed = {
    title: "title",
    description: "description",
    dueAt: "due_at",
    source: "source",
    sourceId: "source_id",
    isCompleted: "is_completed",
  };

  const set = [];
  const params = [];
  let idx = 1;

  for (const [key, column] of Object.entries(allowed)) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      set.push(`${column} = $${idx}`);
      params.push(updates[key]);
      idx += 1;
    }
  }

  if (set.length === 0) {
    return null;
  }

  params.push(reminderId, userId);

  const q = `UPDATE reminders
             SET ${set.join(", ")}
             WHERE id = $${idx} AND user_id = $${idx + 1}
             RETURNING id, user_id, title, description, due_at, source, source_id, is_completed, created_at, updated_at`;

  const { rows } = await pool.query(q, params);
  return rows[0] || null;
}

async function deleteReminder({ userId, reminderId }) {
  const q = `DELETE FROM reminders
             WHERE id = $1 AND user_id = $2
             RETURNING id`;
  const { rows } = await pool.query(q, [reminderId, userId]);
  return rows[0] ? true : false;
}

async function upsertCanvasConnection(
  { userId, icsUrl, lastSyncedAt },
  client = pool
) {
  const q = `INSERT INTO canvas_connections (user_id, ics_url, last_synced_at)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id)
             DO UPDATE SET ics_url = EXCLUDED.ics_url,
                           last_synced_at = EXCLUDED.last_synced_at,
                           updated_at = NOW()
             RETURNING user_id, ics_url, last_synced_at, created_at, updated_at, (xmax = 0) AS inserted`;
  const params = [userId, icsUrl, lastSyncedAt || null];
  const { rows } = await client.query(q, params);
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    userId: row.user_id,
    icsUrl: row.ics_url,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    inserted: row.inserted,
  };
}

async function findCanvasConnectionByUserId(userId) {
  const q = `SELECT user_id, ics_url, last_synced_at, created_at, updated_at
             FROM canvas_connections
             WHERE user_id = $1
             LIMIT 1`;
  const { rows } = await pool.query(q, [userId]);
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    userId: row.user_id,
    icsUrl: row.ics_url,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listCanvasConnections(client = pool) {
  const q = `SELECT user_id, ics_url
             FROM canvas_connections
             WHERE ics_url IS NOT NULL`;
  const { rows } = await client.query(q);
  return rows.map((row) => ({
    userId: row.user_id,
    icsUrl: row.ics_url,
  }));
}

async function upsertCanvasReminder(
  { userId, title, description, dueAt, sourceId },
  client = pool
) {
  const q = `INSERT INTO reminders (user_id, title, description, due_at, source, source_id, is_completed)
             VALUES ($1, $2, $3, $4, $5, $6, FALSE)
             ON CONFLICT (user_id, source, source_id)
             DO UPDATE SET title = EXCLUDED.title,
                           description = EXCLUDED.description,
                           due_at = EXCLUDED.due_at,
                           updated_at = NOW()
             RETURNING id, user_id, title, description, due_at, source, source_id, is_completed, created_at, updated_at, (xmax = 0) AS inserted`;
  const params = [
    userId,
    title,
    description || null,
    dueAt,
    CANVAS_SOURCE,
    sourceId,
  ];
  const { rows } = await client.query(q, params);
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    reminder: {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      dueAt: row.due_at,
      source: row.source,
      sourceId: row.source_id,
      isCompleted: row.is_completed,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    inserted: row.inserted,
  };
}

async function deleteCanvasRemindersNotIn(
  { userId, sourceIds },
  client = pool
) {
  if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
    const q = `DELETE FROM reminders
               WHERE user_id = $1 AND source = $2
               RETURNING id`;
    const { rows } = await client.query(q, [userId, CANVAS_SOURCE]);
    return rows.length;
  }

  const q = `DELETE FROM reminders
             WHERE user_id = $1
               AND source = $2
               AND (source_id IS NULL OR NOT (source_id = ANY($3::text[])))
             RETURNING id`;
  const { rows } = await client.query(q, [userId, CANVAS_SOURCE, sourceIds]);
  return rows.length;
}

module.exports = {
  pool,
  findUserByEmail,
  createUser,
  listReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  upsertCanvasConnection,
  findCanvasConnectionByUserId,
  listCanvasConnections,
  upsertCanvasReminder,
  deleteCanvasRemindersNotIn,
};
