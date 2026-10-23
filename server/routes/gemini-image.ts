import { Router } from "express";
import { asyncRoute } from "@/server/middleware/async-route";
import { requireRole } from "@/server/middleware/session";
import { editLogo, parseLogoUpload, type LogoToolMode } from "@/server/services/gemini-image";

export const geminiImageRouter = Router();

const MODES = new Set<LogoToolMode>(["remove", "enhance"]);

geminiImageRouter.post(
  "/api/logo-tools",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const body = req.body as { mode?: string; image?: string };
    if (!body.mode || !MODES.has(body.mode as LogoToolMode)) {
      res.status(400).json({ error: "Choose remove background or enhance." });
      return;
    }
    if (typeof body.image !== "string" || !body.image) {
      res.status(400).json({ error: "Upload a logo first." });
      return;
    }
    try {
      const upload = parseLogoUpload(body.image);
      const image = await editLogo(body.mode as LogoToolMode, upload);
      res.json(image);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gemini request failed.";
      const status = message.includes("GEMINI_API_KEY") ? 503 : 400;
      res.status(status).json({ error: message });
    }
  }),
);
