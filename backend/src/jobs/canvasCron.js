const cron = require("node-cron");
const { listCanvasConnections } = require("../db");
const { syncCanvasForUser } = require("../canvasSync");

const CANVAS_SYNC_EXPRESSION = "0 */2 * * *"; // every two hours at minute 0

let canvasSyncTask = null;

async function runCanvasSyncSweep() {
  const startedAt = new Date();
  console.log(
    `[canvasCron] Starting Canvas sync sweep at ${startedAt.toISOString()}`
  );

  const connections = await listCanvasConnections();
  if (!connections.length) {
    console.log("[canvasCron] No Canvas connections found; skipping.");
    return;
  }

  let successCount = 0;
  let failureCount = 0;

  for (const connection of connections) {
    try {
      await syncCanvasForUser({
        userId: connection.userId,
        icsUrl: connection.icsUrl,
      });
      successCount += 1;
    } catch (error) {
      failureCount += 1;
      console.error(
        `[canvasCron] Failed to sync user ${connection.userId}:`,
        error
      );
    }
  }

  const finishedAt = new Date();
  console.log(
    `[canvasCron] Completed sweep at ${finishedAt.toISOString()} (success: ${successCount}, failed: ${failureCount}).`
  );
}

function startCanvasSyncJob() {
  if (canvasSyncTask) {
    return canvasSyncTask;
  }

  canvasSyncTask = cron.schedule(CANVAS_SYNC_EXPRESSION, () => {
    runCanvasSyncSweep().catch((error) => {
      console.error("[canvasCron] Unhandled error in sweep:", error);
    });
  });

  console.log(
    `[canvasCron] Scheduled Canvas sync job with expression "${CANVAS_SYNC_EXPRESSION}".`
  );

  return canvasSyncTask;
}

module.exports = {
  startCanvasSyncJob,
  runCanvasSyncSweep,
};
