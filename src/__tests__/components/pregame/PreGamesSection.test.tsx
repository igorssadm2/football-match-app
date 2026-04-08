import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { PreGamesSection } from "@/components/pregame/PreGamesSection";
import { ErrorProvider } from "@/contexts/ErrorContext";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const samplePreGame = {
  id: "pg-1",
  group_id: "grp-1",
  name: "Pelada das Sextas",
  type: "single",
  status: "open",
  match_date: "2026-04-01T00:00:00Z",
  starts_at: "2026-04-01T18:00:00Z",
  location_name: "Arena Soccer",
  min_players: 10,
  max_players: 20,
  visibility: "private",
  created_at: "2026-03-27T00:00:00Z",
};

function renderSection(props = { groupId: "grp-1", isAdmin: false }) {
  return render(
    <ErrorProvider>
      <PreGamesSection {...props} />
    </ErrorProvider>
  );
}

describe("PreGamesSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("1. Renders the list of pregames", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ items: [samplePreGame] }),
    });
    renderSection();
    await waitFor(() =>
      expect(screen.getByText("Pelada das Sextas")).toBeInTheDocument()
    );
    expect(screen.getByText("Arena Soccer")).toBeInTheDocument();
  });

  it("2. Renders empty state when list is empty", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ items: [] }),
    });
    renderSection();
    await waitFor(() =>
      expect(screen.getByText("Nenhuma partida programada.")).toBeInTheDocument()
    );
  });

  it("3. Each pregame item links to /pregames/[id]", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ items: [samplePreGame] }),
    });
    renderSection();
    await waitFor(() =>
      expect(screen.getByText("Pelada das Sextas")).toBeInTheDocument()
    );
    const link = screen.getByText("Pelada das Sextas").closest("a");
    expect(link).toHaveAttribute("href", `/pregames/${samplePreGame.id}`);
  });

  it("4. Fetch retorna erro 500 → componente não quebra e não lista partidas", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({ title: "Erro interno" }),
    });
    expect(() => renderSection()).not.toThrow();
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    // Após erro não-ok, preGames fica vazio → mostra empty state
    await waitFor(() =>
      expect(screen.getByText("Nenhuma partida programada.")).toBeInTheDocument()
    );
  });

  it("5. Fetch retorna resposta sem campo 'items' → exibe empty state", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}), // sem 'items'
    });
    renderSection();
    await waitFor(() =>
      expect(screen.getByText("Nenhuma partida programada.")).toBeInTheDocument()
    );
  });

  it("6. isAdmin=true → exibe botão 'Nova Partida'", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ items: [] }),
    });
    renderSection({ groupId: "grp-1", isAdmin: true });
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(screen.getByText("+ Nova Partida")).toBeInTheDocument();
  });

  it("7. isAdmin=false → não exibe botão 'Nova Partida'", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ items: [] }),
    });
    renderSection({ groupId: "grp-1", isAdmin: false });
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(screen.queryByText("+ Nova Partida")).not.toBeInTheDocument();
  });
});
