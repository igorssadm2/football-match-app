import { resolveRegistrationRoute } from "@/lib/registrationFlow";
import { backendFetch } from "@/lib/backend";

jest.mock("@/lib/backend", () => ({
  backendFetch: jest.fn(),
}));

const mockBackendFetch = backendFetch as jest.MockedFunction<typeof backendFetch>;

function makeResponse(ok: boolean, body: unknown, status = 200): Response {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function makeThrowingResponse(ok: boolean): Response {
  return {
    ok,
    status: 200,
    json: jest.fn().mockRejectedValue(new Error("JSON parse error")),
  } as unknown as Response;
}

describe("resolveRegistrationRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("1. backendFetch throws → returns /dashboard (fail-open)", async () => {
    mockBackendFetch.mockRejectedValue(new Error("network error"));
    const result = await resolveRegistrationRoute();
    expect(result).toBe("/dashboard");
  });

  it("2. Profile response not ok → returns /cadastro", async () => {
    mockBackendFetch.mockResolvedValue(makeResponse(false, {}, 400));
    const result = await resolveRegistrationRoute();
    expect(result).toBe("/cadastro");
  });

  it("3. Profile JSON parse fails → returns /cadastro (height_cm defaults to 0)", async () => {
    mockBackendFetch.mockResolvedValueOnce(makeThrowingResponse(true));
    const result = await resolveRegistrationRoute();
    expect(result).toBe("/cadastro");
  });

  it("4. height_cm = 0 → returns /cadastro", async () => {
    mockBackendFetch.mockResolvedValueOnce(
      makeResponse(true, { profile: { height_cm: 0 } })
    );
    const result = await resolveRegistrationRoute();
    expect(result).toBe("/cadastro");
  });

  it("5. Profile complete + survey completed → returns /dashboard", async () => {
    mockBackendFetch
      .mockResolvedValueOnce(makeResponse(true, { profile: { height_cm: 175 } }))
      .mockResolvedValueOnce(makeResponse(true, { is_completed: true }));
    const result = await resolveRegistrationRoute();
    expect(result).toBe("/dashboard");
  });

  it("6. Profile complete + survey pending → returns /cadastro?etapa=esportes", async () => {
    mockBackendFetch
      .mockResolvedValueOnce(makeResponse(true, { profile: { height_cm: 175 } }))
      .mockResolvedValueOnce(makeResponse(true, { is_completed: false }));
    const result = await resolveRegistrationRoute();
    expect(result).toBe("/cadastro?etapa=esportes");
  });

  it("7. Profile complete + survey endpoint not ok → returns /dashboard (fail-open)", async () => {
    mockBackendFetch
      .mockResolvedValueOnce(makeResponse(true, { profile: { height_cm: 175 } }))
      .mockResolvedValueOnce(makeResponse(false, {}, 500));
    const result = await resolveRegistrationRoute();
    expect(result).toBe("/dashboard");
  });

  it("8. Profile complete + skills AND marketing completed → /dashboard", async () => {
    // Backend computes is_completed = skills AND marketing; frontend just reads is_completed
    mockBackendFetch
      .mockResolvedValueOnce(makeResponse(true, { profile: { height_cm: 175 } }))
      .mockResolvedValueOnce(makeResponse(true, { is_completed: true }));
    const result = await resolveRegistrationRoute();
    expect(result).toBe("/dashboard");
  });

  it("9. Profile complete + skills NOT completed → /cadastro?etapa=esportes", async () => {
    // Backend returns is_completed: false when skills is incomplete (even if marketing is done)
    mockBackendFetch
      .mockResolvedValueOnce(makeResponse(true, { profile: { height_cm: 175 } }))
      .mockResolvedValueOnce(makeResponse(true, { is_completed: false }));
    const result = await resolveRegistrationRoute();
    expect(result).toBe("/cadastro?etapa=esportes");
  });

  it("10. Profile complete + marketing NOT completed → /cadastro?etapa=esportes", async () => {
    // Backend returns is_completed: false when marketing is incomplete (even if skills is done)
    mockBackendFetch
      .mockResolvedValueOnce(makeResponse(true, { profile: { height_cm: 175 } }))
      .mockResolvedValueOnce(makeResponse(true, { is_completed: false }));
    const result = await resolveRegistrationRoute();
    expect(result).toBe("/cadastro?etapa=esportes");
  });

  // --- Corner cases ---

  it("11. height_cm ausente na resposta (undefined) → retorna /cadastro", async () => {
    // profileData?.profile?.height_cm ?? 0 avalia para 0 → perfil incompleto
    mockBackendFetch.mockResolvedValueOnce(
      makeResponse(true, { profile: {} }) // height_cm ausente
    );
    const result = await resolveRegistrationRoute();
    expect(result).toBe("/cadastro");
  });

  it("12. profile ausente na resposta → retorna /cadastro", async () => {
    mockBackendFetch.mockResolvedValueOnce(
      makeResponse(true, {}) // profile ausente
    );
    const result = await resolveRegistrationRoute();
    expect(result).toBe("/cadastro");
  });

  it("13. Primeiro fetch OK, segundo lança exceção → retorna /dashboard (fail-open)", async () => {
    mockBackendFetch
      .mockResolvedValueOnce(makeResponse(true, { profile: { height_cm: 175 } }))
      .mockRejectedValueOnce(new Error("network timeout"));
    const result = await resolveRegistrationRoute();
    expect(result).toBe("/dashboard");
  });

  it("14. is_completed é null → trata como falsy → retorna /cadastro?etapa=esportes", async () => {
    mockBackendFetch
      .mockResolvedValueOnce(makeResponse(true, { profile: { height_cm: 175 } }))
      .mockResolvedValueOnce(makeResponse(true, { is_completed: null }));
    const result = await resolveRegistrationRoute();
    expect(result).toBe("/cadastro?etapa=esportes");
  });

  it("15. survey JSON parse falha → trata como null → retorna /cadastro?etapa=esportes", async () => {
    mockBackendFetch
      .mockResolvedValueOnce(makeResponse(true, { profile: { height_cm: 175 } }))
      .mockResolvedValueOnce(makeThrowingResponse(true));
    const result = await resolveRegistrationRoute();
    expect(result).toBe("/cadastro?etapa=esportes");
  });
});
