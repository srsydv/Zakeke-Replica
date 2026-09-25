import { Router } from "express";
import type { RushTier } from "@/lib/pricing/rush-pricing";
import { quoteOrder, type SizeQty } from "@/lib/quote";
import { asyncRoute } from "@/server/middleware/async-route";
import { getProduct } from "@/server/services/catalog";

export const priceRouter = Router();

priceRouter.post(
  "/api/price",
  asyncRoute(async (req, res) => {
    const body = req.body as {
      productId: number;
      sizeQuantities: SizeQty[];
      placementCodes?: string[];
      decoration?: "print" | "embroidery";
      stitchCount?: number;
      rushTier?: RushTier;
      colorName?: string;
    };
    const product = await getProduct(body.productId);
    if (!product) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(
      quoteOrder({
        product,
        colorName: body.colorName,
        sizeQuantities: body.sizeQuantities ?? [],
        placementCodes: body.placementCodes ?? ["FRONT"],
        decoration: body.decoration ?? "print",
        stitchCount: body.stitchCount,
        rushTier: body.rushTier,
      }),
    );
  }),
);
