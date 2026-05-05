import { createServer } from "node:http";
import express from "express";
import cors from "cors";
import { initDb, saveDb } from "./db.js"; // initialize db on startup
import roomsRouter from "./routes/rooms.js";
import geometryObjectsRouter from "./routes/geometryObjects.js";
import { markMcpRequest, rateLimitMiddleware } from "./middleware/rateLimit.js";
import { initRealtime } from "./realtime/index.js";

const PORT = parseInt(process.env.PORT ?? "4000", 10);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";

const app = express();

app.use(cors({ origin: WEB_ORIGIN }));
app.use(express.json());
app.use(markMcpRequest);
app.use(rateLimitMiddleware);

app.use("/rooms", roomsRouter);
app.use("/rooms", geometryObjectsRouter);

// Graceful shutdown to save DB
process.on("SIGINT", () => {
  saveDb();
  process.exit(0);
});
process.on("SIGTERM", () => {
  saveDb();
  process.exit(0);
});

async function start() {
  await initDb();
  const server = createServer(app);
  initRealtime(server);
  server.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
  });
}

start();