const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  listReminders,
  createReminder,
  updateReminder,
  deleteReminder,
} = require("../db");

const router = express.Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const reminders = await listReminders(req.user.id);
    return res.json({ reminders });
  } catch (err) {
    console.error("[reminders:list] error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      dueAt,
      due_at: dueAtSnake,
      source,
      sourceId,
      source_id: sourceIdSnake,
      isCompleted,
      is_completed: isCompletedSnake,
    } = req.body || {};

    const dueDate = dueAt ?? dueAtSnake;
    const srcId = sourceId ?? sourceIdSnake;
    const completedValue = isCompleted ?? isCompletedSnake ?? false;

    if (!title || !dueDate) {
      return res
        .status(400)
        .json({ error: "title and dueAt (ISO string) are required" });
    }

    const reminder = await createReminder({
      userId: req.user.id,
      title,
      description,
      dueAt: dueDate,
      source,
      sourceId: srcId,
      isCompleted: completedValue,
    });

    return res.status(201).json({ reminder });
  } catch (err) {
    console.error("[reminders:create] error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const reminderId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(reminderId)) {
      return res.status(400).json({ error: "invalid_id" });
    }

    const updates = {};
    const body = req.body || {};

    if (Object.prototype.hasOwnProperty.call(body, "title")) {
      updates.title = body.title;
    }
    if (Object.prototype.hasOwnProperty.call(body, "description")) {
      updates.description = body.description;
    }
    if (Object.prototype.hasOwnProperty.call(body, "dueAt")) {
      updates.dueAt = body.dueAt;
    } else if (Object.prototype.hasOwnProperty.call(body, "due_at")) {
      updates.dueAt = body.due_at;
    }
    if (Object.prototype.hasOwnProperty.call(body, "source")) {
      updates.source = body.source;
    }
    if (Object.prototype.hasOwnProperty.call(body, "sourceId")) {
      updates.sourceId = body.sourceId;
    } else if (Object.prototype.hasOwnProperty.call(body, "source_id")) {
      updates.sourceId = body.source_id;
    }
    if (Object.prototype.hasOwnProperty.call(body, "isCompleted")) {
      updates.isCompleted = body.isCompleted;
    } else if (Object.prototype.hasOwnProperty.call(body, "is_completed")) {
      updates.isCompleted = body.is_completed;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "no updatable fields provided" });
    }

    const reminder = await updateReminder({
      userId: req.user.id,
      reminderId,
      updates,
    });

    if (!reminder) {
      return res.status(404).json({ error: "reminder_not_found" });
    }

    return res.json({ reminder });
  } catch (err) {
    console.error("[reminders:update] error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const reminderId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(reminderId)) {
      return res.status(400).json({ error: "invalid_id" });
    }

    const deleted = await deleteReminder({
      userId: req.user.id,
      reminderId,
    });

    if (!deleted) {
      return res.status(404).json({ error: "reminder_not_found" });
    }

    return res.status(204).send();
  } catch (err) {
    console.error("[reminders:delete] error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

module.exports = router;
