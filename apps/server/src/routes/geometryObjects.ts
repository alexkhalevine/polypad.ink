import { Router } from "express";
import type { Request } from "express";
import { getLockManager, getSelectionRegistry } from "../realtime/registry.js";
import { listObjects, createObject, batchCreateObjects, updateObject, deleteObject } from "../services/roomService.js";
import { WireObjectSchema, BatchCreateObjectBodySchema, UpdatePatchSchema } from "../openapi/schemas.js";

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
  const parsed = WireObjectSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid object format" });
    return;
  }

  const result = await createObject(id, parsed.data, { actor: actorFor(req) });

  if ("error" in result) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(201).json({ ok: true, id: result.id });
});

router.post("/:id/objects/batch", async (req, res) => {
  const { id } = req.params;
  const parsed = BatchCreateObjectBodySchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Body must include a non-empty 'objects' array" });
    return;
  }

  const result = await batchCreateObjects(id, parsed.data.objects, { actor: actorFor(req) });

  if ("error" in result) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(201).json({ ok: true, inserted: result.inserted, ids: result.ids });
});

router.delete("/:id/objects/:objectId", async (req, res) => {
  const { id, objectId } = req.params;
  const actor = actorFor(req);

  if (!req.isMcp) {
    const lockStatus = getLockManager().isLockedByOther(id, objectId, actor);
    if (lockStatus.locked) {
      res.status(409).json({ error: "locked", lockedBy: lockStatus.lockedBy });
      return;
    }
    const selStatus = getSelectionRegistry().isSelectedByOther(id, objectId, actor);
    if (selStatus.selected) {
      res.status(409).json({ error: "selected", selectedBy: selStatus.selectedBy });
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
  const parsed = UpdatePatchSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid patch fields" });
    return;
  }

  const actor = actorFor(req);

  if (!req.isMcp) {
    const lockStatus = getLockManager().isLockedByOther(id, objectId, actor);
    if (lockStatus.locked) {
      res.status(409).json({ error: "locked", lockedBy: lockStatus.lockedBy });
      return;
    }
    const selStatus = getSelectionRegistry().isSelectedByOther(id, objectId, actor);
    if (selStatus.selected) {
      res.status(409).json({ error: "selected", selectedBy: selStatus.selectedBy });
      return;
    }
  }

  const result = await updateObject(id, objectId, parsed.data, { actor });

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
