import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3100";
const COOKIE_NAME = "__session";

async function getToken(): Promise<string> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value ?? "";
  return decodeURIComponent(raw);
}

export async function backendFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getToken();
  return fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}
