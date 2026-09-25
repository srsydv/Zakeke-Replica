import { NextResponse } from "next/server";
import { encodeSession, findAccount, SESSION_COOKIE, toPublicUser } from "@/lib/auth";

export async function POST(req: Request) {
  const body = (await req.json()) as { email?: string; password?: string };
  const account = findAccount(body.email ?? "", body.password ?? "");
  if (!account) {
    return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  }
  const user = toPublicUser(account);
  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, encodeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
