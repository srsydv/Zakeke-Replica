export type Role = "user" | "admin";

export type SessionUser = {
  email: string;
  name: string;
  role: Role;
  address?: string;
};

export const DEMO_ACCOUNTS: Array<SessionUser & { password: string }> = [
  {
    email: "user@bluecotton.test",
    password: "user123",
    role: "user",
    name: "Sam Designer",
    address: "18 High Street, Test Town",
  },
  {
    email: "admin@bluecotton.test",
    password: "admin123",
    role: "admin",
    name: "Alex Production",
    address: "BlueCotton print floor, Bowling Green",
  },
];

export const SESSION_COOKIE = "bc-session";

export function parseSessionValue(raw?: string | null): SessionUser | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as SessionUser;
    if (!data.email || (data.role !== "user" && data.role !== "admin")) return null;
    return data;
  } catch {
    return null;
  }
}

export function encodeSession(user: SessionUser) {
  return Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
}

export function findAccount(email: string, password: string) {
  return DEMO_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password,
  );
}

export function toPublicUser(account: SessionUser & { password?: string }): SessionUser {
  return {
    email: account.email,
    name: account.name,
    role: account.role,
    address: account.address,
  };
}
