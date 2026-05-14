import "./tracing.js";
import { createServer } from "node:http";
import express from "express";
import cors from "cors";
import { initDb, saveDbSync } from "./db.js"; // initialize db on startup
import roomsRouter from "./routes/rooms.js";
import geometryObjectsRouter from "./routes/geometryObjects.js";
import { markMcpRequest, rateLimitMiddleware } from "./middleware/rateLimit.js";
import { initRealtime } from "./realtime/index.js";
import { getJoinMetrics } from "./realtime/metrics.js";
import { sdk } from "./tracing.js";

const PORT = parseInt(process.env.PORT ?? "4000", 10);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";
const DEBUG_RT = process.env.DEBUG_RT === "1";

const app = express();

app.use(cors({ origin: WEB_ORIGIN }));
app.use(express.json());
app.use(markMcpRequest);
app.use(rateLimitMiddleware);

app.use("/rooms", roomsRouter);
app.use("/rooms", geometryObjectsRouter);

if (DEBUG_RT) {
  app.get("/__metrics", (_req, res) => {
    res.json({ join: getJoinMetrics() });
  });
}

// Graceful shutdown to save DB and flush OTel
function shutdown() {
  saveDbSync();
  sdk.shutdown().finally(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function start() {
  await initDb();
  const server = createServer(app);
  initRealtime(server);
  server.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
  });
}

start();