import { getSession } from "@/lib/firebase/session";
import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: jest.fn(),
}));

const mockCookies = cookies as jest.MockedFunction<typeof cookies>;
const mockGetAdminAuth = getAdminAuth as jest.MockedFunction<typeof getAdminAuth>;

function makeCookieStore(value: string | undefined) {
  return {
    get: jest.fn((name: string) =>
      name === "__session" && value !== undefined ? { value } : undefined
    ),
  };
}

function makeCookieStoreWithUser(sessionValue: string, userValue: string) {
  return {
    get: jest.fn((name: string) => {
      if (name === "__session") return { value: sessionValue };
      if (name === "__session_user") return { value: encodeURIComponent(userValue) };
      return undefined;
    }),
  };
}

function makeAdminAuth(verifyResult: unknown, shouldThrow = false) {
  return {
    verifyIdToken: jest.fn(async () => {
      if (shouldThrow) throw new Error("invalid token");
      return verifyResult;
    }),
  };
}

describe("getSession()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("1. No cookie → returns null", async () => {
    mockCookies.mockResolvedValue(makeCookieStore(undefined) as never);
    const result = await getSession();
    expect(result).toBeNull();
  });

  it("2. Cookie present + token valid → returns { uid, email, picture, name }", async () => {
    mockCookies.mockResolvedValue(makeCookieStore("valid-token") as never);
    const decoded = {
      uid: "user-123",
      email: "test@example.com",
      picture: "https://example.com/pic.jpg",
      name: "Test User",
    };
    mockGetAdminAuth.mockReturnValue(makeAdminAuth(decoded) as never);
    const result = await getSession();
    expect(result).toEqual({
      uid: "user-123",
      email: "test@example.com",
      picture: "https://example.com/pic.jpg",
      name: "Test User",
    });
  });

  it("3. Cookie present + token invalid (verifyIdToken throws) → returns null", async () => {
    mockCookies.mockResolvedValue(makeCookieStore("invalid-token") as never);
    mockGetAdminAuth.mockReturnValue(makeAdminAuth(null, true) as never);
    const result = await getSession();
    expect(result).toBeNull();
  });

  it("4. Token is URL-decoded before being passed to verifyIdToken", async () => {
    const encoded = "tok%3Dwith%3Dequals";
    const decoded = "tok=with=equals";
    mockCookies.mockResolvedValue(makeCookieStore(encoded) as never);
    const adminAuth = makeAdminAuth({ uid: "u1", email: "a@b.com" });
    mockGetAdminAuth.mockReturnValue(adminAuth as never);
    await getSession();
    expect(adminAuth.verifyIdToken).toHaveBeenCalledWith(decoded);
  });

  it("5. email missing in decoded token → returns null for email field", async () => {
    mockCookies.mockResolvedValue(makeCookieStore("some-token") as never);
    const decoded = {
      uid: "user-456",
      // email is missing — undefined
      picture: "https://example.com/pic.jpg",
      name: "No Email User",
    };
    mockGetAdminAuth.mockReturnValue(makeAdminAuth(decoded) as never);
    const result = await getSession();
    expect(result).not.toBeNull();
    expect(result!.email).toBeNull();
  });

  // --- Corner cases: tokens malformados ---

  it("6. Cookie com valor não-JWT (texto aleatório) → vai para Firebase e retorna null se falhar", async () => {
    mockCookies.mockResolvedValue(makeCookieStore("not-a-jwt-at-all") as never);
    mockGetAdminAuth.mockReturnValue(makeAdminAuth(null, true) as never);
    const result = await getSession();
    expect(result).toBeNull();
  });

  it("7. Token vamojogar expirado (exp no passado) → retorna null", async () => {
    // Monta um token manual com iss: vamojogar e exp no passado
    const expiredPayload = { iss: "vamojogar", user_id: "u1", exp: Math.floor(Date.now() / 1000) - 3600 };
    const b64 = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
    const token = `header.${b64}.signature`;
    mockCookies.mockResolvedValue(makeCookieStore(token) as never);
    const result = await getSession();
    expect(result).toBeNull();
  });

  it("8. Token vamojogar sem exp → não expira, retorna sessão válida", async () => {
    const payloadNoExp = { iss: "vamojogar", user_id: "u2" }; // sem exp
    const b64 = Buffer.from(JSON.stringify(payloadNoExp)).toString("base64url");
    const token = `header.${b64}.signature`;
    mockCookies.mockResolvedValue(
      makeCookieStoreWithUser(token, JSON.stringify({ email: "u2@example.com" })) as never
    );
    const result = await getSession();
    expect(result).not.toBeNull();
    expect(result!.uid).toBe("u2");
  });

  it("9. Token com JSON malformado no payload → trata como Firebase token e retorna null se inválido", async () => {
    // Base64url de payload inválido
    const invalidB64 = "aW52YWxpZC1qc29u"; // "invalid-json" em base64
    const token = `header.${invalidB64}.signature`;
    mockCookies.mockResolvedValue(makeCookieStore(token) as never);
    mockGetAdminAuth.mockReturnValue(makeAdminAuth(null, true) as never);
    const result = await getSession();
    expect(result).toBeNull();
  });
});
