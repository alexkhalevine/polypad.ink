import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { rooms } from "../schema.js";

const router = Router();

router.get("/:id", (req, res) => {
  const { id } = req.params;

  db.insert(rooms).values({ id, name: `Room ${id}` }).onConflictDoNothing().run();

  const row = db.select().from(rooms).where(eq(rooms.id, id)).get();

  if (!row) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  res.json(row);
});

export default router;