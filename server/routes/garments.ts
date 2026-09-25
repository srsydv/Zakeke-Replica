import { Router } from "express";
import { asyncRoute } from "@/server/middleware/async-route";
import { requireRole } from "@/server/middleware/session";
import {
  getOrCreateGarment,
  listGarments,
  regenerateGarment,
  saveGarment,
  toPublicGarment,
  type StoredGarment,
} from "@/server/services/garments";

export const garmentsRouter = Router();

garmentsRouter.get(
  "/api/v2/garments",
  asyncRoute(async (_req, res) => {
    res.json({ garments: (await listGarments()).map(toPublicGarment) });
  }),
);

garmentsRouter.get(
  "/api/v2/garment/:id",
  asyncRoute(async (req, res) => {
    const garment = await getOrCreateGarment(Number(req.params.id));
    if (!garment) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(toPublicGarment(garment));
  }),
);

garmentsRouter.put(
  "/api/v2/garment/:id",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const existing = await getOrCreateGarment(Number(req.params.id));
    if (!existing) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const body = req.body as Partial<StoredGarment>;
    const saved = await saveGarment({
      ...existing,
      ...body,
      id: existing.id,
      sides: body.sides ?? existing.sides,
    });
    res.json(toPublicGarment(saved));
  }),
);

garmentsRouter.post(
  "/api/v2/garment/:id",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const body = (req.body ?? {}) as { regenerate?: boolean };
    if (!body.regenerate) {
      res.status(400).json({ error: "Unsupported action." });
      return;
    }
    const saved = await regenerateGarment(Number(req.params.id));
    if (!saved) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(toPublicGarment(saved));
  }),
);
