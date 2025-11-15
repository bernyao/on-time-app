require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const healthRouter = require("./routes/health");
app.use("/api/health", healthRouter);
const authRouter = require("./routes/authRoutes");
app.use("/api/auth", authRouter);
const reminderRouter = require("./routes/reminderRoutes");
app.use("/api/reminders", reminderRouter);
const canvasRouter = require("./routes/canvasRoutes");
app.use("/api/canvas", canvasRouter);

const { startCanvasSyncJob } = require("./jobs/canvasCron");
startCanvasSyncJob();

app.listen(PORT, () => {
  console.log(`ontime backend listening on port ${PORT}`);
});
