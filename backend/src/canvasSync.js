const ical = require("node-ical");
const {
  pool,
  upsertCanvasReminder,
  deleteCanvasRemindersNotIn,
  upsertCanvasConnection,
} = require("./db");

const CANVAS_SOURCE = "canvas";

async function fetchCanvasEvents(icsUrl) {
  if (!icsUrl) {
    throw new Error("ICS URL is required");
  }

  const data = await ical.async.fromURL(icsUrl);
  const events = [];

  // node-ical returns metadata entries along with events; filter to VEVENTs.
  for (const item of Object.values(data)) {
    if (!item || item.type !== "VEVENT") {
      continue;
    }

    const uid = item.uid;
    const dueAt = item.start ? new Date(item.start) : null;
    if (!uid || !dueAt) {
      continue;
    }

    events.push({
      uid,
      summary: item.summary || "Canvas Event",
      description: item.description || null,
      dueAt,
    });
  }

  return events;
}

async function syncCanvasForUser({ userId, icsUrl }) {
  const events = await fetchCanvasEvents(icsUrl);
  const client = await pool.connect();
  let created = 0;
  let updated = 0;
  let removed = 0;
  const seenIds = [];

  try {
    await client.query("BEGIN");

    for (const event of events) {
      const { inserted } = await upsertCanvasReminder(
        {
          userId,
          title: event.summary,
          description: event.description,
          dueAt: event.dueAt,
          sourceId: event.uid,
        },
        client
      );

      seenIds.push(event.uid);
      if (inserted) {
        created += 1;
      } else {
        updated += 1;
      }
    }

    removed = await deleteCanvasRemindersNotIn(
      { userId, sourceIds: seenIds },
      client
    );

    const syncedAt = new Date();
    await upsertCanvasConnection(
      { userId, icsUrl, lastSyncedAt: syncedAt },
      client
    );

    await client.query("COMMIT");

    return {
      source: CANVAS_SOURCE,
      created,
      updated,
      removed,
      totalEvents: events.length,
      syncedAt,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  fetchCanvasEvents,
  syncCanvasForUser,
};
