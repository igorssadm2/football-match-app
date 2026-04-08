import { backendFetch } from "@/lib/backend";
import { cookies } from "next/headers";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

const mockCookies = cookies as jest.MockedFunction<typeof cookies>;

function makeCookieStore(value: string | undefined) {
  return {
    get: jest.fn((name: string) =>
      name === "__session" && value !== undefined ? { value } : undefined
    ),
  };
}

describe("backendFetch()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Response);
    // Set default BACKEND_URL
    process.env.BACKEND_URL = "http://localhost:3100";
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("1. Cookie present → Authorization header is Bearer <token>", async () => {
    const token = "my-firebase-token";
    mockCookies.mockResolvedValue(makeCookieStore(token) as never);
    await backendFetch("/api/v1/test");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/test"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${token}`,
        }),
      })
    );
  });

  it("2. URL-encoded cookie → token is decoded before use", async () => {
    const rawToken = "tok%3Dwith%3Dequals";
    const decodedToken = "tok=with=equals";
    mockCookies.mockResolvedValue(makeCookieStore(rawToken) as never);
    await backendFetch("/api/v1/test");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${decodedToken}`,
        }),
      })
    );
  });

  it("3. No cookie → Authorization header is Bearer  (empty string)", async () => {
    mockCookies.mockResolvedValue(makeCookieStore(undefined) as never);
    await backendFetch("/api/v1/test");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer ",
        }),
      })
    );
  });

  it("4. Custom headers in init → merged with Content-Type and Authorization", async () => {
    const token = "my-token";
    mockCookies.mockResolvedValue(makeCookieStore(token) as never);
    await backendFetch("/api/v1/test", {
      headers: { "X-Custom-Header": "custom-value" },
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Custom-Header": "custom-value",
        }),
      })
    );
  });

  it("5. fetch is called with BACKEND_URL + path concatenated", async () => {
    mockCookies.mockResolvedValue(makeCookieStore("token") as never);
    await backendFetch("/api/v1/resource");
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3100/api/v1/resource",
      expect.any(Object)
    );
  });
});
