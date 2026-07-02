import { Router } from "express";
import { listRoomsForAdmin } from "../services/roomService.js";

const router = Router();

const PAGE_SIZE = 100;

router.get("/rooms", async (req, res) => {
  const pageParam = typeof req.query.page === "string" ? parseInt(req.query.page, 10) : 1;
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const search = typeof req.query.q === "string" && req.query.q.trim() ? req.query.q.trim() : undefined;

  const { rows, total } = await listRoomsForAdmin({ page, pageSize: PAGE_SIZE, search });

  res.json({ rooms: rows, total, page, pageSize: PAGE_SIZE });
});

export default router;
