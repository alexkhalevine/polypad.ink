import { Router } from "express";
import { createRoom, findRoomById } from "../services/roomService.js";
import { safeEqualCode } from "../services/inviteCode.js";

const router = Router();

router.post("/", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name : "";
  const result = createRoom(name);
  if ("error" in result) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.json({ id: result.id, inviteCode: result.inviteCode });
});

router.get("/:id/verify", async (req, res) => {
  const row = findRoomById(req.params.id);
  const code = typeof req.query.code === "string" ? req.query.code : "";
  if (!row || !safeEqualCode(code, row.inviteCode)) {
    res.status(404).json({ ok: false });
    return;
  }
  res.json({ ok: true });
});

export default router;
