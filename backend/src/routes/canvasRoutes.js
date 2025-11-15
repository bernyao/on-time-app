const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  upsertCanvasConnection,
  findCanvasConnectionByUserId,
} = require("../db");
const { syncCanvasForUser } = require("../canvasSync");

const router = express.Router();

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (err) {
    return false;
  }
}

router.use(authMiddleware);

router.post("/connect", async (req, res) => {
  try {
    const rawUrl = (req.body && req.body.icsUrl) || "";
    if (typeof rawUrl !== "string" || rawUrl.trim().length === 0) {
      return res.status(400).json({ error: "ics_url_required" });
    }

    const icsUrl = rawUrl.trim();

    if (!isValidHttpUrl(icsUrl)) {
      return res.status(400).json({ error: "invalid_ics_url" });
    }
    const connection = await upsertCanvasConnection({
      userId: req.user.id,
      icsUrl,
      lastSyncedAt: null,
    });

    const status = connection && connection.inserted ? 201 : 200;
    return res.status(status).json({ connection });
  } catch (err) {
    console.error("[canvas:connect] error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

router.post("/sync", async (req, res) => {
  try {
    const overrideUrl =
      typeof req.body?.icsUrl === "string" && req.body.icsUrl.trim().length > 0
        ? req.body.icsUrl.trim()
        : null;

    if (overrideUrl && !isValidHttpUrl(overrideUrl)) {
      return res.status(400).json({ error: "invalid_ics_url" });
    }

    const existing = await findCanvasConnectionByUserId(req.user.id);
    const icsUrl = overrideUrl || existing?.icsUrl;

    if (icsUrl && !isValidHttpUrl(icsUrl)) {
      return res.status(400).json({ error: "invalid_ics_url" });
    }

    if (!icsUrl) {
      return res.status(404).json({ error: "no_canvas_connection" });
    }

    const syncSummary = await syncCanvasForUser({
      userId: req.user.id,
      icsUrl,
    });

    const connection = await findCanvasConnectionByUserId(req.user.id);

    return res.json({ connection, sync: syncSummary });
  } catch (err) {
    console.error("[canvas:sync] error", err);
    const msg = err && err.message ? err.message.toLowerCase() : "";
    if (
      msg.includes("fetch") ||
      msg.includes("http") ||
      (err && typeof err.code === "string")
    ) {
      return res.status(502).json({ error: "failed_to_fetch_ics" });
    }
    return res.status(500).json({ error: "internal_error" });
  }
});

module.exports = router;
