import { GET, PATCH } from "@/app/api/marketingQuestions/survey-status/route";
import { getSession } from "@/lib/firebase/session";
import { backendFetch } from "@/lib/backend";
import { NextRequest } from "next/server";

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock("@/lib/firebase/session", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/lib/backend", () => ({
  backendFetch: jest.fn(),
}));

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockBackendFetch = backendFetch as jest.MockedFunction<typeof backendFetch>;

function makeResponse(ok: boolean, body: unknown, status = 200): Response {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function makeRequest(body?: unknown): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body ?? {}),
  } as unknown as NextRequest;
}

const SESSION = { uid: "firebase-uid-456", email: "user@test.com" };

describe("GET /api/marketingQuestions/survey-status", () => {
  beforeEach(() => jest.clearAllMocks());

  it("1. sem sessão → 401 unauthorized", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.type).toBe("unauthorized");
  });

  it("2. backendFetch lança exceção → 503 connection_error", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockBackendFetch.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.type).toBe("connection_error");
  });

  it("3. backend retorna { is_completed: true } → repassa com status 200", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockBackendFetch.mockResolvedValue(makeResponse(true, { is_completed: true }));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.is_completed).toBe(true);
  });

  it("4. backend retorna { is_completed: false } → repassa corretamente", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockBackendFetch.mockResolvedValue(makeResponse(true, { is_completed: false }));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.is_completed).toBe(false);
  });

  it("5. chama o endpoint correto no backend", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockBackendFetch.mockResolvedValue(makeResponse(true, { is_completed: false }));
    await GET();
    expect(mockBackendFetch).toHaveBeenCalledWith(
      "/api/v1/marketingQuestions/survey-status",
      expect.objectContaining({ method: "GET" })
    );
  });
});

describe("PATCH /api/marketingQuestions/survey-status", () => {
  beforeEach(() => jest.clearAllMocks());

  it("6. sem sessão → 401 unauthorized", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await PATCH(makeRequest({ survey_type: "marketing", shown_at: "2024-01-01T00:00:00Z" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.type).toBe("unauthorized");
  });

  it("7. backendFetch lança exceção → 503 connection_error", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockBackendFetch.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await PATCH(makeRequest({ survey_type: "marketing", shown_at: "2024-01-01T00:00:00Z" }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.type).toBe("connection_error");
  });

  it("8. repassa body para o backend sem modificação", async () => {
    const patchBody = {
      survey_type: "registration",
      shown_at: "2024-01-01T00:00:00Z",
      completed_at: "2024-01-01T01:00:00Z",
    };
    mockGetSession.mockResolvedValue(SESSION);
    mockBackendFetch.mockResolvedValue(makeResponse(true, { ok: true }));
    await PATCH(makeRequest(patchBody));
    expect(mockBackendFetch).toHaveBeenCalledWith(
      "/api/v1/marketingQuestions/survey-status",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify(patchBody),
      })
    );
  });

  it("9. backend retorna erro → repassa status e body", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockBackendFetch.mockResolvedValue(
      makeResponse(false, { error: "invalid survey_type" }, 400)
    );
    const res = await PATCH(makeRequest({ survey_type: "invalido", shown_at: "2024-01-01T00:00:00Z" }));
    expect(res.status).toBe(400);
  });

  it("10. backend ok → retorna { ok: true } com status 200", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockBackendFetch.mockResolvedValue(makeResponse(true, { ok: true }));
    const res = await PATCH(makeRequest({ survey_type: "marketing", shown_at: "2024-01-01T00:00:00Z" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
