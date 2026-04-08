import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateGroupForm from "@/app/grupos/novo/CreateGroupForm";
import { ErrorProvider } from "@/contexts/ErrorContext";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

function renderForm() {
  return render(
    <ErrorProvider>
      <CreateGroupForm />
    </ErrorProvider>
  );
}

/** Fluxo real: etapa 0 → 1 → 2, depois "Criar Grupo". */
async function goToFinalStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Próximo →/i }));
  await user.click(screen.getByRole("button", { name: /Próximo →/i }));
}

function getCreateButton() {
  return screen.getByRole("button", { name: /Criar Grupo/i });
}

describe("CreateGroupForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("1. Renders step 0 fields; capacidade aparece no passo 1", async () => {
    const user = userEvent.setup();
    renderForm();
    expect(screen.getByLabelText(/Nome do grupo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Descrição/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Nome do grupo/i), "Meu Grupo");
    await user.click(screen.getByRole("button", { name: /Próximo →/i }));
    expect(screen.getByLabelText(/Capacidade máxima/i)).toBeInTheDocument();
  });

  it("2. Submit calls POST /api/groups", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: "grp-new" }),
    });
    renderForm();
    await user.type(screen.getByLabelText(/Nome do grupo/i), "Novo Grupo");
    await goToFinalStep(user);
    await user.click(getCreateButton());
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/groups",
        expect.objectContaining({ method: "POST" })
      )
    );
    const call = mockFetch.mock.calls.find((c) => c[0] === "/api/groups");
    expect(call).toBeDefined();
    const body = JSON.parse((call![1] as { body: string }).body);
    expect(body.settings?.football_config).toBeDefined();
    expect(body.settings?.access).toBeUndefined();
  });

  it("3. Mostra tela de sucesso após criar", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: "grp-new" }),
    });
    renderForm();
    await user.type(screen.getByLabelText(/Nome do grupo/i), "Novo Grupo");
    await goToFinalStep(user);
    await user.click(getCreateButton());
    await waitFor(() => expect(screen.getByText(/Grupo criado/i)).toBeInTheDocument());
  });

  it("4. Shows error on failure", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      json: jest.fn().mockResolvedValue({
        title: "Erro de validação",
        type: "validation_error",
        message: "Nome inválido",
      }),
    });
    renderForm();
    await user.type(screen.getByLabelText(/Nome do grupo/i), "Grupo Teste");
    await goToFinalStep(user);
    await user.click(getCreateButton());
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();
  });
});
