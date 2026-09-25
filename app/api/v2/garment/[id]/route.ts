import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getOrCreateGarment, regenerateGarment, saveGarment, toPublicGarment, type StoredGarment } from "@/lib/garments";
import { parseSessionValue, SESSION_COOKIE } from "@/lib/auth-accounts";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const garment = await getOrCreateGarment(Number(id));
  if (!garment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(toPublicGarment(garment));
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = parseSessionValue((await cookies()).get(SESSION_COOKIE)?.value);
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  }
  const existing = await getOrCreateGarment(Number(id));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json()) as Partial<StoredGarment>;
  const saved = saveGarment({
    ...existing,
    ...body,
    id: existing.id,
    sides: body.sides ?? existing.sides,
  });
  return NextResponse.json(toPublicGarment(saved));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = parseSessionValue((await cookies()).get(SESSION_COOKIE)?.value);
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { regenerate?: boolean };
  if (!body.regenerate) {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }
  const saved = await regenerateGarment(Number(id));
  if (!saved) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(toPublicGarment(saved));
}
