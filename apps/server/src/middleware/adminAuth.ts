import type { Request, Response, NextFunction } from "express";
import { safeEqualCode } from "../services/inviteCode.js";

/**
 * Guards the private /admin/* surface used by the polypad-admin panel.
 *
 * Requires `Authorization: Bearer <ADMIN_API_TOKEN>`. If ADMIN_API_TOKEN isn't set,
 * every request is rejected — there's no "open by default" fallback.
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const token = process.env.ADMIN_API_TOKEN;
  const header = req.header("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";

  if (!token || !provided || !safeEqualCode(provided, token)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  next();
}
