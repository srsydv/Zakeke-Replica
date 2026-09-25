import { Router } from "express";
import { fromPriceForProduct } from "@/lib/quote";
import { asyncRoute } from "@/server/middleware/async-route";
import { getProduct, listProducts } from "@/server/services/catalog";

export const productsRouter = Router();

productsRouter.get(
  "/api/products",
  asyncRoute(async (req, res) => {
    const { items, total } = await listProducts({
      shop: typeof req.query.shop === "string" ? req.query.shop : undefined,
      q: typeof req.query.q === "string" ? req.query.q : undefined,
      limit: Number(req.query.limit || 24),
      offset: Number(req.query.offset || 0),
    });
    res.json({
      total,
      items: items.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        shop: p.shop,
        colors: p.colors.length,
        fromPrice: fromPriceForProduct(p),
      })),
    });
  }),
);

productsRouter.get(
  "/api/products/:id",
  asyncRoute(async (req, res) => {
    const product = await getProduct(String(req.params.id));
    if (!product) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ...product, fromPrice: fromPriceForProduct(product) });
  }),
);
