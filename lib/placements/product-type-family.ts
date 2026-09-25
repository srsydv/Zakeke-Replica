export type GarmentFamily =
  | "upper_wear"
  | "hi_vis"
  | "coveralls"
  | "bottom_wear"
  | "headwear";

const PRODUCT_TYPE_TO_FAMILY: Record<string, GarmentFamily> = {
  "T-Shirts": "upper_wear",
  "Vests (t-shirt)": "upper_wear",
  Polos: "upper_wear",
  Shirts: "upper_wear",
  Blouses: "upper_wear",
  Sweatshirts: "upper_wear",
  Hoodies: "upper_wear",
  Jackets: "upper_wear",
  Softshells: "upper_wear",
  Fleece: "upper_wear",
  "Gilets & Body Warmers": "upper_wear",
  "Sports Overtops": "upper_wear",
  Trackwear: "upper_wear",
  Tunics: "upper_wear",
  Dresses: "upper_wear",
  Gowns: "upper_wear",
  Robes: "upper_wear",
  "Knitted Jumpers": "upper_wear",
  "Chef Jackets": "upper_wear",
  Waistcoats: "upper_wear",
  "Safety Vests": "hi_vis",
  Tabards: "hi_vis",
  Coveralls: "coveralls",
  Dungarees: "coveralls",
  Trousers: "bottom_wear",
  Jeans: "bottom_wear",
  Leggings: "bottom_wear",
  Shorts: "bottom_wear",
  Chinos: "bottom_wear",
  Sweatpants: "bottom_wear",
  Beanies: "headwear",
  Caps: "headwear",
  Hats: "headwear",
  Helmets: "headwear",
  Headwear: "headwear",
  "Result Headwear": "headwear",
};

export function resolveGarmentFamily(productType: string | null | undefined): GarmentFamily {
  const trimmed = productType?.trim();
  if (!trimmed) return "upper_wear";
  return PRODUCT_TYPE_TO_FAMILY[trimmed] ?? "upper_wear";
}
