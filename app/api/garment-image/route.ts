import { NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set(["cdn.pimber.ly"]);

function isAllowed(url: URL) {
  if (url.protocol !== "https:") return false;
  return ALLOWED_HOSTS.has(url.hostname) || url.hostname.endsWith(".pimber.ly");
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "Missing url" }, { status: 400 });
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  if (!isAllowed(target)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 400 });
  }

  const upstream = await fetch(target, {
    headers: { Accept: "image/*" },
    next: { revalidate: 86400 },
  });
  if (!upstream.ok) {
    return NextResponse.json({ error: "Image fetch failed" }, { status: 502 });
  }

  const type = upstream.headers.get("content-type") || "image/jpeg";
  if (!type.startsWith("image/")) {
    return NextResponse.json({ error: "Not an image" }, { status: 400 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": type,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
