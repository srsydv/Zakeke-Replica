import { Router } from "express";
import { encodeSession, findAccount, toPublicUser } from "@/lib/auth-accounts";
import { asyncRoute } from "@/server/middleware/async-route";
import { clearSessionCookie, sessionFromReq, setSessionCookie } from "@/server/middleware/session";

export const authRouter = Router();

authRouter.post(
  "/api/auth/login",
  asyncRoute(async (req, res) => {
    const body = req.body as { email?: string; password?: string };
    const account = findAccount(body.email ?? "", body.password ?? "");
    if (!account) {
      res.status(401).json({ error: "Wrong email or password." });
      return;
    }
    const user = toPublicUser(account);
    setSessionCookie(res, encodeSession(user));
    res.json({ user });
  }),
);

authRouter.post("/api/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get("/api/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.redirect("/login");
});

authRouter.get("/api/auth/me", (req, res) => {
  res.json({ user: sessionFromReq(req) });
});
