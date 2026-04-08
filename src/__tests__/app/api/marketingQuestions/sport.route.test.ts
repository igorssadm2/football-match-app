import { GET, POST } from "@/app/api/marketingQuestions/[sport]/route";
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

function makeParams(sport: string) {
  return { params: Promise.resolve({ sport }) };
}

const SESSION = { uid: "firebase-uid-123", email: "user@test.com" };

describe("GET /api/marketingQuestions/[sport]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("1. sem sessão → 401 unauthorized", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeRequest(), makeParams("football"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.type).toBe("unauthorized");
  });

  it("2. backendFetch lança exceção → 503 connection_error", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockBackendFetch.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await GET(makeRequest(), makeParams("football"));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.type).toBe("connection_error");
  });

  it("3. backend retorna erro → repassa status e body de erro", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockBackendFetch.mockResolvedValue(
      makeResponse(false, { title: "Not Found", type: "not_found", message: "Sport not found" }, 404)
    );
    const res = await GET(makeRequest(), makeParams("football"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.title).toBe("Not Found");
    expect(body.type).toBe("not_found");
  });

  it("4. backend ok → retorna lista de perguntas", async () => {
    const questions = [{ id: "buy_frequency", label: "Frequência?", type: "select", options: ["Mensalmente"] }];
    mockGetSession.mockResolvedValue(SESSION);
    mockBackendFetch.mockResolvedValue(makeResponse(true, questions));
    const res = await GET(makeRequest(), makeParams("football"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(questions);
  });

  it("5. chama backendFetch com UID do usuário e sport corretos", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockBackendFetch.mockResolvedValue(makeResponse(true, []));
    await GET(makeRequest(), makeParams("basketball"));
    expect(mockBackendFetch).toHaveBeenCalledWith(
      expect.stringContaining("firebase-uid-123"),
      expect.objectContaining({ method: "GET" })
    );
    expect(mockBackendFetch).toHaveBeenCalledWith(
      expect.stringContaining("basketball"),
      expect.anything()
    );
  });
});

describe("POST /api/marketingQuestions/[sport]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("6. sem sessão → 401 unauthorized", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ buy_frequency: "Mensalmente" }), makeParams("football"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.type).toBe("unauthorized");
  });

  it("7. backendFetch lança exceção → 503 connection_error", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockBackendFetch.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await POST(makeRequest({ buy_frequency: "Mensalmente" }), makeParams("football"));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.type).toBe("connection_error");
  });

  it("8. repassa o body como objeto plano, sem wrapper { answers }", async () => {
    const answers = { buy_frequency: "Mensalmente", budget: "Até R$100" };
    mockGetSession.mockResolvedValue(SESSION);
    mockBackendFetch.mockResolvedValue(makeResponse(true, { ok: true }));
    await POST(makeRequest(answers), makeParams("football"));
    expect(mockBackendFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(answers),
      })
    );
  });

  it("9. backend retorna erro → repassa title/type/message e status", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockBackendFetch.mockResolvedValue(
      makeResponse(false, { title: "Inválido", type: "validation_error", message: "Resposta inválida" }, 400)
    );
    const res = await POST(makeRequest({ buy_frequency: "X" }), makeParams("football"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.type).toBe("validation_error");
    expect(body.title).toBe("Inválido");
  });

  it("10. backend ok → retorna { ok: true } com status 200", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockBackendFetch.mockResolvedValue(makeResponse(true, { ok: true }));
    const res = await POST(makeRequest({ buy_frequency: "Mensalmente" }), makeParams("football"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
