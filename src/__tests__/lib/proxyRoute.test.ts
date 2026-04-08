import { proxy, unauthorizedResponse, unavailableResponse } from "@/lib/proxyRoute";
import { getSession } from "@/lib/firebase/session";
import { backendFetch } from "@/lib/backend";

jest.mock("next/server", () => {
  function NextResponse(body: unknown, init?: { status?: number }) {
    return {
      status: init?.status ?? 200,
      json: async () => (body == null ? {} : body),
    };
  }
  Object.assign(NextResponse, {
    json(body: unknown, init?: { status?: number }) {
      return {
        status: init?.status ?? 200,
        json: async () => body,
      };
    },
  });
  return { NextResponse };
});

jest.mock("@/lib/firebase/session", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/lib/backend", () => ({
  backendFetch: jest.fn(),
}));

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockBackendFetch = backendFetch as jest.MockedFunction<typeof backendFetch>;

function makeResponse(
  ok: boolean,
  body: unknown,
  status = 200
): Response {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function makeThrowingJsonResponse(ok: boolean, status = 500): Response {
  return {
    ok,
    status,
    json: jest.fn().mockRejectedValue(new Error("invalid JSON")),
  } as unknown as Response;
}

function makeNoBodyResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue({}),
  } as unknown as Response;
}

describe("proxy()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("1. getSession() returns null → returns 401 with type unauthorized", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await proxy("/api/test", {}, "Fallback");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.type).toBe("unauthorized");
  });

  it("2. backendFetch throws → returns 503 with type connection_error", async () => {
    mockGetSession.mockResolvedValue({ uid: "u1", email: "u@test.com" });
    mockBackendFetch.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await proxy("/api/test", {}, "Fallback");
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.type).toBe("connection_error");
  });

  it("3. Backend returns non-ok with full error body → response has correct title/type/message and status", async () => {
    mockGetSession.mockResolvedValue({ uid: "u1", email: "u@test.com" });
    mockBackendFetch.mockResolvedValue(
      makeResponse(false, { title: "Not Found", type: "not_found", message: "Resource missing" }, 404)
    );
    const res = await proxy("/api/test", {}, "Fallback");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.title).toBe("Not Found");
    expect(body.type).toBe("not_found");
    expect(body.message).toBe("Resource missing");
  });

  it("4. Backend returns non-ok with invalid JSON → uses fallbackTitle, type server_error", async () => {
    mockGetSession.mockResolvedValue({ uid: "u1", email: "u@test.com" });
    mockBackendFetch.mockResolvedValue(makeThrowingJsonResponse(false, 500));
    const res = await proxy("/api/test", {}, "My Fallback Title");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.title).toBe("My Fallback Title");
    expect(body.type).toBe("server_error");
  });

  it("5. Backend returns 204 → repassa 204 sem corpo (RFC 7231)", async () => {
    mockGetSession.mockResolvedValue({ uid: "u1", email: "u@test.com" });
    mockBackendFetch.mockResolvedValue(makeNoBodyResponse(204));
    const res = await proxy("/api/test", {}, "Fallback");
    expect(res.status).toBe(204);
    const body = await res.json();
    expect(body).toEqual({});
  });

  it("6. Backend returns 200 with data → returns data with successStatus", async () => {
    mockGetSession.mockResolvedValue({ uid: "u1", email: "u@test.com" });
    mockBackendFetch.mockResolvedValue(makeResponse(true, { id: "123", name: "Test" }, 200));
    const res = await proxy("/api/test", {}, "Fallback", 200);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("123");
    expect(body.name).toBe("Test");
  });

  it("6b. Backend returns 201 with data → repassa corpo com successStatus 201 (ex.: POST team-draw)", async () => {
    mockGetSession.mockResolvedValue({ uid: "u1", email: "u@test.com" });
    mockBackendFetch.mockResolvedValue(
      makeResponse(true, { draw_run_id: "dr1", teams: [] }, 201)
    );
    const res = await proxy("/api/test", { method: "POST" }, "Fallback", 201);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.draw_run_id).toBe("dr1");
  });

  it("7. Backend returns non-ok with errors field → errors included in response body", async () => {
    mockGetSession.mockResolvedValue({ uid: "u1", email: "u@test.com" });
    mockBackendFetch.mockResolvedValue(
      makeResponse(
        false,
        {
          title: "Validation Error",
          type: "validation_error",
          message: "Fields invalid",
          errors: { name: ["Name is required"] },
        },
        422
      )
    );
    const res = await proxy("/api/test", {}, "Fallback");
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.errors).toEqual({ name: ["Name is required"] });
  });

  it("8. Backend returns business code → code included in response body", async () => {
    mockGetSession.mockResolvedValue({ uid: "u1", email: "u@test.com" });
    mockBackendFetch.mockResolvedValue(
      makeResponse(
        false,
        {
          title: "Validation Error",
          type: "validation_error",
          message: "Validation failed",
          code: "team_draw_min_confirmed_not_reached",
        },
        400
      )
    );
    const res = await proxy("/api/test", {}, "Fallback");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("team_draw_min_confirmed_not_reached");
  });
});

describe("unauthorizedResponse()", () => {
  it("9. returns 401 with correct shape", async () => {
    const res = unauthorizedResponse();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.type).toBe("unauthorized");
    expect(body.title).toBeDefined();
    expect(body.message).toBeDefined();
  });
});

describe("unavailableResponse()", () => {
  it("10. returns 503 with correct shape", async () => {
    const res = unavailableResponse();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.type).toBe("connection_error");
    expect(body.title).toBeDefined();
    expect(body.message).toBeDefined();
  });
});
