import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PendingInvites } from "@/components/pregame/PendingInvites";
import { ErrorProvider } from "@/contexts/ErrorContext";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const sampleInvite = {
  pregame_id: "pg-invite-1",
  group_id: "grp-1",
  name: "Pelada de Quarta",
  match_date: "2026-04-02T00:00:00Z",
  starts_at: "2026-04-02T19:00:00Z",
  location_name: "Quadra Central",
  status: "invited",
  max_players: 14,
};

function renderPendingInvites() {
  return render(
    <ErrorProvider>
      <PendingInvites />
    </ErrorProvider>
  );
}

describe("PendingInvites", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("1. Renders list of pending invites", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ items: [sampleInvite] }),
    });
    renderPendingInvites();
    await waitFor(() =>
      expect(screen.getByText("Pelada de Quarta")).toBeInTheDocument()
    );
    expect(screen.getByText("Quadra Central", { exact: false })).toBeInTheDocument();
  });

  it("2. Renders nothing when list is empty", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ items: [] }),
    });
    const { container } = renderPendingInvites();
    await waitFor(() => {
      // loading state should be gone after fetch
      expect(mockFetch).toHaveBeenCalled();
    });
    // Component returns null when no invites
    expect(container.firstChild).toBeNull();
  });

  it("3. Accept button calls the correct API", async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ items: [sampleInvite] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });
    renderPendingInvites();
    await waitFor(() =>
      expect(screen.getByText("Pelada de Quarta")).toBeInTheDocument()
    );
    const acceptBtn = screen.getByText("Tá dentro");
    await user.click(acceptBtn);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/pregames/${sampleInvite.pregame_id}/accept-invite`,
      expect.objectContaining({ method: "POST" })
    );
  });

  it("4. Decline button calls the correct API", async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ items: [sampleInvite] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });
    renderPendingInvites();
    await waitFor(() =>
      expect(screen.getByText("Pelada de Quarta")).toBeInTheDocument()
    );
    const declineBtn = screen.getByText("Tá fora");
    await user.click(declineBtn);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/pregames/${sampleInvite.pregame_id}/decline-invite`,
      expect.objectContaining({ method: "POST" })
    );
  });

  it("5. Invite disappears from list after accepting", async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ items: [sampleInvite] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });
    renderPendingInvites();
    await waitFor(() =>
      expect(screen.getByText("Pelada de Quarta")).toBeInTheDocument()
    );
    await user.click(screen.getByText("Tá dentro"));
    await waitFor(() =>
      expect(screen.queryByText("Pelada de Quarta")).not.toBeInTheDocument()
    );
  });

  it("6. Fetch retorna erro 500 → componente não quebra", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({ title: "Erro interno" }),
    });
    // Não deve lançar exceção — componente retorna null silenciosamente
    expect(() => renderPendingInvites()).not.toThrow();
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
  });

  it("7. Fetch retorna resposta sem campo 'items' → não quebra", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}), // sem 'items'
    });
    const { container } = renderPendingInvites();
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    // Componente retorna null quando não há invites
    expect(container.firstChild).toBeNull();
  });

  it("8. Accept falha com erro do servidor → convite permanece na lista", async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ items: [sampleInvite] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: jest.fn().mockResolvedValue({ title: "Erro", type: "validation_error", message: "Já confirmado." }),
      });
    renderPendingInvites();
    await waitFor(() =>
      expect(screen.getByText("Pelada de Quarta")).toBeInTheDocument()
    );
    await user.click(screen.getByText("Tá dentro"));
    // Convite deve permanecer visível após erro
    await waitFor(() =>
      expect(screen.getByText("Pelada de Quarta")).toBeInTheDocument()
    );
  });
});
