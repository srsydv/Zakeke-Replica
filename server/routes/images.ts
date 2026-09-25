import { Router } from "express";
import { Readable } from "node:stream";
import { asyncRoute } from "@/server/middleware/async-route";

export const imagesRouter = Router();

const ALLOWED_HOSTS = new Set(["cdn.pimber.ly"]);

function isAllowedImageHost(url: URL) {
  if (url.protocol !== "https:") return false;
  return ALLOWED_HOSTS.has(url.hostname) || url.hostname.endsWith(".pimber.ly");
}

imagesRouter.get(
  "/api/garment-image",
  asyncRoute(async (req, res) => {
    const raw = typeof req.query.url === "string" ? req.query.url : "";
    if (!raw) {
      res.status(400).json({ error: "Missing url" });
      return;
    }
    let target: URL;
    try {
      target = new URL(raw);
    } catch {
      res.status(400).json({ error: "Invalid url" });
      return;
    }
    if (!isAllowedImageHost(target)) {
      res.status(400).json({ error: "Host not allowed" });
      return;
    }
    const upstream = await fetch(target, { headers: { Accept: "image/*" } });
    if (!upstream.ok || !upstream.body) {
      res.status(502).json({ error: "Image fetch failed" });
      return;
    }
    const type = upstream.headers.get("content-type") || "image/jpeg";
    if (!type.startsWith("image/")) {
      res.status(400).json({ error: "Not an image" });
      return;
    }
    res.setHeader("Content-Type", type);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    Readable.fromWeb(upstream.body as import("node:stream/web").ReadableStream).pipe(res);
  }),
);
