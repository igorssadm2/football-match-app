import { getAdminAuth } from "@/lib/firebase/admin";
import { cookies } from "next/headers";

const COOKIE_NAME = "__session";
const USER_COOKIE_NAME = "__session_user";

export interface SessionUser {
  uid: string;
  email: string | null;
  picture?: string;
  name?: string;
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const token = decodeURIComponent(raw);

  // Token manual (iss: "vamojogar") — decodificar sem Firebase Admin
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
      if (payload.iss === "vamojogar") {
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
        const userRaw = store.get(USER_COOKIE_NAME)?.value;
        const userInfo = userRaw ? JSON.parse(decodeURIComponent(userRaw)) : {};
        return {
          uid: payload.user_id,
          email: userInfo.email ?? null,
          name: userInfo.name,
          picture: userInfo.picture ?? undefined,
        };
      }
    }
  } catch { /* não é token manual — continuar para Firebase */ }

  // Token Firebase (fluxo Google)
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      picture: decoded.picture,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}
