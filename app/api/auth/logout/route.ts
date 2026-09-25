import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

function clearSession(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}

export async function POST() {
  return clearSession(NextResponse.json({ ok: true }));
}

export async function GET(req: Request) {
  const url = new URL("/login", req.url);
  return clearSession(NextResponse.redirect(url));
}
