import cookieParser from "cookie-parser";
import express, { type NextFunction, type Request, type Response } from "express";
import { authRouter } from "@/server/routes/auth";
import { garmentsRouter } from "@/server/routes/garments";
import { healthRouter } from "@/server/routes/health";
import { imagesRouter } from "@/server/routes/images";
import { ordersRouter } from "@/server/routes/orders";
import { priceRouter } from "@/server/routes/price";
import { productsRouter } from "@/server/routes/products";

export function createApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json({ limit: "20mb" }));
  app.use(healthRouter);
  app.use(authRouter);
  app.use(productsRouter);
  app.use(priceRouter);
  app.use(ordersRouter);
  app.use(garmentsRouter);
  app.use(imagesRouter);
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  });
  return app;
}
