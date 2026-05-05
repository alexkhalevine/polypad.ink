import { Router } from "express";
import type { Request } from "express";
import { getLockManager } from "../realtime/registry.js";
import { listObjects, createObject, batchCreateObjects, updateObject, deleteObject } from "../services/roomService.js";
import type { WireObject } from "../types.js";

const router = Router();

function actorFor(req: Request): string {
  if (req.isMcp) return "mcp";
  return req.header("x-polypad-user-id") ?? "anonymous";
}

router.get("/:id/objects", async (req, res) => {
  const { id } = req.params;
  const response = await listObjects(id);
  res.json(response);
});

router.post("/:id/objects", async (req, res) => {
  const { id } = req.params;
  const body = req.body as WireObject;

  if (!body.type || !body.data) {
    res.status(400).json({ error: "Invalid object format" });
    return;
  }

  const result = await createObject(id, body, { actor: actorFor(req) });

  if ("error" in result) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(201).json({ ok: true });
});

router.post("/:id/objects/batch", async (req, res) => {
  const { id } = req.params;
  const body = req.body as { objects?: WireObject[] };

  if (!body.objects || !Array.isArray(body.objects) || body.objects.length === 0) {
    res.status(400).json({ error: "Body must include a non-empty 'objects' array" });
    return;
  }

  for (const obj of body.objects) {
    if (!obj || !obj.type || !obj.data) {
      res.status(400).json({ error: "Invalid object format in batch" });
      return;
    }
  }

  const result = await batchCreateObjects(id, body.objects, { actor: actorFor(req) });

  if ("error" in result) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(201).json({ ok: true, inserted: result.inserted });
});

router.delete("/:id/objects/:objectId", async (req, res) => {
  const { id, objectId } = req.params;
  const actor = actorFor(req);

  if (!req.isMcp) {
    const status = getLockManager().isLockedByOther(id, objectId, actor);
    if (status.locked) {
      res.status(409).json({ error: "locked", lockedBy: status.lockedBy });
      return;
    }
  }

  const result = await deleteObject(id, objectId, { actor });

  if ("error" in result) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  if (!result.ok) {
    res.status(404).json({ error: "Object not found" });
    return;
  }

  res.status(204).end();
});

router.patch("/:id/objects/:objectId", async (req, res) => {
  const { id, objectId } = req.params;
  const body = req.body as { color?: string; center?: { x: number; y: number; z: number } };
  const actor = actorFor(req);

  if (!req.isMcp) {
    const status = getLockManager().isLockedByOther(id, objectId, actor);
    if (status.locked) {
      res.status(409).json({ error: "locked", lockedBy: status.lockedBy });
      return;
    }
  }

  const result = await updateObject(id, objectId, body, { actor });

  if ("error" in result) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  if (!result.ok) {
    res.status(404).json({ error: "Object not found" });
    return;
  }

  res.json({ ok: true });
});

export default router;
