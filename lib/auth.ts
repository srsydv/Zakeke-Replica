import { cookies } from "next/headers";
import { parseSessionValue, SESSION_COOKIE, type SessionUser } from "./auth-accounts";

export {
  DEMO_ACCOUNTS,
  SESSION_COOKIE,
  encodeSession,
  findAccount,
  parseSessionValue,
  toPublicUser,
  type Role,
  type SessionUser,
} from "./auth-accounts";

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  return parseSessionValue(store.get(SESSION_COOKIE)?.value);
}
