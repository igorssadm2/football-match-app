import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ErrorProvider,
  useError,
  parseBackendError,
} from "@/contexts/ErrorContext";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ─── parseBackendError ────────────────────────────────────────────────────────

function makeResponse(body: unknown, throwOnJson = false): Response {
  return {
    json: throwOnJson
      ? jest.fn().mockRejectedValue(new Error("JSON error"))
      : jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("parseBackendError()", () => {
  it("1. Response with full body { title, type, message } → returns those values", async () => {
    const res = makeResponse({ title: "T", type: "ty", message: "M" });
    const result = await parseBackendError(res);
    expect(result.title).toBe("T");
    expect(result.type).toBe("ty");
    expect(result.message).toBe("M");
  });

  it("2. Response with errors field → includes errors in return", async () => {
    const errors = { field: ["Required"] };
    const res = makeResponse({ title: "T", type: "v", message: "M", errors });
    const result = await parseBackendError(res);
    expect(result.errors).toEqual(errors);
  });

  it("3. Response where res.json() throws → returns fallback values", async () => {
    const res = makeResponse(null, true);
    const result = await parseBackendError(res, {
      title: "FB Title",
      type: "fb_type",
      message: "FB Message",
    });
    expect(result.title).toBe("FB Title");
    expect(result.type).toBe("fb_type");
    expect(result.message).toBe("FB Message");
  });

  it("4. No fallback + JSON fails → returns default strings", async () => {
    const res = makeResponse(null, true);
    const result = await parseBackendError(res);
    expect(result.title).toBe("Erro de Comunicação");
    expect(result.type).toBe("network_error");
    expect(result.message).toBeDefined();
  });

  it("5. Body missing title → uses fallback.title", async () => {
    const res = makeResponse({ type: "some_type", message: "Some message" });
    const result = await parseBackendError(res, { title: "Fallback Title" });
    expect(result.title).toBe("Fallback Title");
    expect(result.type).toBe("some_type");
    expect(result.message).toBe("Some message");
  });
});

// ─── ErrorProvider + useError ────────────────────────────────────────────────

function TestComponent({
  onError,
}: {
  onError: (ctx: ReturnType<typeof useError>) => void;
}) {
  const ctx = useError();
  onError(ctx);
  return (
    <div>
      {ctx.errors.map((e) => (
        <div key={e.id} data-testid={`error-${e.id}`}>
          {e.title}
          <button onClick={() => ctx.dismissError(e.id)}>dismiss-{e.id}</button>
        </div>
      ))}
    </div>
  );
}

function renderWithProvider(
  onError: (ctx: ReturnType<typeof useError>) => void
) {
  return render(
    <ErrorProvider>
      <TestComponent onError={onError} />
    </ErrorProvider>
  );
}

describe("ErrorProvider + useError", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("6. pushError with type unauthorized → calls router.push(/login), does NOT add to errors array", () => {
    let ctx!: ReturnType<typeof useError>;
    renderWithProvider((c) => {
      ctx = c;
    });
    act(() => {
      ctx.pushError({
        title: "Unauthorized",
        type: "unauthorized",
        message: "Please login",
      });
    });
    expect(mockPush).toHaveBeenCalledWith("/login");
    expect(ctx.errors).toHaveLength(0);
  });

  it("7. pushError with generic error → adds to errors array with a generated id", () => {
    let ctx!: ReturnType<typeof useError>;
    renderWithProvider((c) => {
      ctx = c;
    });
    act(() => {
      ctx.pushError({ title: "Error", type: "server_error", message: "Fail" });
    });
    expect(ctx.errors).toHaveLength(1);
    expect(ctx.errors[0].id).toBeDefined();
    expect(ctx.errors[0].title).toBe("Error");
  });

  it("8. pushError 4 times → only 3 errors in array (max 3 toasts)", () => {
    let ctx!: ReturnType<typeof useError>;
    renderWithProvider((c) => {
      ctx = c;
    });
    act(() => {
      ctx.pushError({ title: "E1", type: "t1", message: "m1" });
      ctx.pushError({ title: "E2", type: "t2", message: "m2" });
      ctx.pushError({ title: "E3", type: "t3", message: "m3" });
      ctx.pushError({ title: "E4", type: "t4", message: "m4" });
    });
    expect(ctx.errors).toHaveLength(3);
  });

  it("9. dismissError(id) → removes that error from array", () => {
    let ctx!: ReturnType<typeof useError>;
    renderWithProvider((c) => {
      ctx = c;
    });
    act(() => {
      ctx.pushError({ title: "Error A", type: "server_error", message: "msg" });
    });
    const id = ctx.errors[0].id;
    act(() => {
      ctx.dismissError(id);
    });
    expect(ctx.errors).toHaveLength(0);
  });

  it("10. useError outside provider → throws error", () => {
    // Suppress console.error for this test
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    function BadComponent() {
      useError();
      return null;
    }
    expect(() => render(<BadComponent />)).toThrow(
      "useError must be used within ErrorProvider"
    );
    consoleError.mockRestore();
  });

  // --- Corner cases ---

  it("11. dismissError com ID inexistente → silencioso, não altera array", () => {
    let ctx!: ReturnType<typeof useError>;
    renderWithProvider((c) => { ctx = c; });
    act(() => {
      ctx.pushError({ title: "Erro X", type: "server_error", message: "msg" });
    });
    const lengthBefore = ctx.errors.length;
    act(() => {
      ctx.dismissError("id-que-nao-existe-999");
    });
    expect(ctx.errors).toHaveLength(lengthBefore);
  });

  it("12. pushError com type 'UNAUTHORIZED' maiúsculo → redireciona para /login", () => {
    let ctx!: ReturnType<typeof useError>;
    renderWithProvider((c) => { ctx = c; });
    act(() => {
      ctx.pushError({ title: "Não autorizado", type: "UNAUTHORIZED", message: "Sessão expirada" });
    });
    expect(mockPush).toHaveBeenCalledWith("/login");
    expect(ctx.errors).toHaveLength(0);
  });

  it("13. parseBackendError: errors.errors é null → não inclui errors no retorno", async () => {
    const res = makeResponse({ title: "T", type: "v", message: "M", errors: null });
    const result = await parseBackendError(res);
    expect(result.errors).toBeUndefined();
  });
});
