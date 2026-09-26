export type CatalogColor = {
  name: string;
  code?: string;
  hex: string;
  sku: string;
  imageUrl?: string;
  prices?: Record<string, number>;
};

export type CatalogProduct = {
  id: number;
  styleCode: string;
  name: string;
  brand: string;
  category: string;
  shop: string;
  silhouette: "tee" | "hoodie" | "polo" | "jacket" | "cap" | "bag" | "bottoms" | "vest";
  description?: string;
  fabric?: string;
  gender?: string;
  printArea?: string;
  embroideryInfo?: string;
  imageUrl?: string;
  specSheetUrl?: string;
  wholesaleBase: number;
  sizeWholesale: Record<string, number>;
  colors: CatalogColor[];
  sizes: string[];
  faces: string[];
};

export type CatalogFile = {
  generatedAt: string;
  source: string;
  count: number;
  products: CatalogProduct[];
};

export const SHOP_CATEGORIES = [
  { slug: "t-shirts", label: "Custom T-Shirts", blurb: "Crewnecks, vests and everyday tees." },
  { slug: "hoodies", label: "Hoodies", blurb: "Pullover and zip hoodies." },
  { slug: "sweatshirts", label: "Sweatshirts", blurb: "Crews, fleece and jumpers." },
  { slug: "polos", label: "Polos", blurb: "Work and leisure polos." },
  { slug: "jackets", label: "Jackets", blurb: "Softshells, gilets and outerwear." },
  { slug: "hats", label: "Hats", blurb: "Caps, beanies and headwear." },
  { slug: "bags", label: "Bags", blurb: "Totes, backpacks and accessories." },
  { slug: "bottoms", label: "Bottoms", blurb: "Trousers, shorts and joggers." },
  { slug: "shirts", label: "Shirts", blurb: "Shirts, blouses and waistcoats." },
  { slug: "hi-vis", label: "Hi-Vis", blurb: "Safety vests and high-visibility wear." },
  { slug: "workwear", label: "Workwear", blurb: "Everything else from the Ralawise range." },
] as const;

export function shopLabel(slug: string): string {
  return SHOP_CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}
