import { NextResponse } from "next/server";
import { listGarments, toPublicGarment } from "@/lib/garments";

export async function GET() {
  return NextResponse.json({
    garments: listGarments().map(toPublicGarment),
  });
}
