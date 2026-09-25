export {
  GARMENT_TEMPLATE_VERSION,
  buildGarmentTemplate,
  getOrCreateGarment,
  getStoredGarment,
  listGarments,
  persistImportedGarment,
  regenerateGarment,
  saveGarment,
  toPublicGarment,
  type StoredGarment,
} from "@/server/services/garments";

export type { GarmentArea, GarmentEmbroidery, GarmentMask, GarmentSide } from "@/lib/garment-template";
