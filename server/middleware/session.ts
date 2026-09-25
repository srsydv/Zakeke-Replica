import type { NextFunction, Request, Response } from "express";
import { parseSessionValue, SESSION_COOKIE, type SessionUser } from "@/lib/auth-accounts";

export function sessionFromReq(req: Request): SessionUser | null {
  return parseSessionValue(req.cookies?.[SESSION_COOKIE]);
}

export function requireRole(...roles: Array<SessionUser["role"]>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = sessionFromReq(req);
    if (!user || !roles.includes(user.role)) {
      const needAdmin = roles.includes("admin") && !roles.includes("user");
      res.status(401).json({
        error: needAdmin ? "Admin login required." : "Log in as the user to continue.",
      });
      return;
    }
    next();
  };
}

export function setSessionCookie(res: Response, value: string, maxAge = 60 * 60 * 24 * 7) {
  res.cookie(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: maxAge * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.cookie(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}
