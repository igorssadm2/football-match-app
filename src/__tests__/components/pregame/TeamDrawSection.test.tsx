import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmProvider } from "@/contexts/ConfirmContext";
import { TeamDrawSection } from "@/components/pregame/TeamDrawSection";

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function isMainTeamDrawUrl(url: string) {
  return (
    url.includes("/team-draw") &&
    !url.includes("whatsapp") &&
    !url.includes("confirm") &&
    !url.includes("assignments")
  );
}

function renderSection(canManage = true) {
  return render(
    <ConfirmProvider>
      <TeamDrawSection pregameId="pg-1" canManage={canManage} />
    </ConfirmProvider>
  );
}

describe("TeamDrawSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("GET 404 mostra estado vazio com CTA de sortear", async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";
      if (isMainTeamDrawUrl(url) && method === "GET") {
        return Promise.resolve(mockResponse(404, { code: "not_found" }));
      }
      return Promise.resolve(mockResponse(404, {}));
    });
    renderSection(true);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Realizar sorteio" })).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: "Realizar sorteio" })).toBeInTheDocument();
  });

  it("POST sucesso renderiza os times", async () => {
    const draw201 = {
      draw_run_id: "d1",
      pregame_id: "pg-1",
      num_teams: 2,
      seed_used: 123,
      balance_by_overall: true,
      is_confirmed: false,
      balance_goalkeepers: true,
      teams: [
        { id: "t1", name: "Time A", players: [{ participant_id: "p1", name: "João", overall: 8 }] },
        { id: "t2", name: "Time B", players: [{ participant_id: "p2", name: "Pedro", overall: 7 }] },
      ],
    };
    mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";
      if (isMainTeamDrawUrl(url) && method === "GET") {
        return Promise.resolve(mockResponse(404, {}));
      }
      if (isMainTeamDrawUrl(url) && method === "POST") {
        return Promise.resolve(mockResponse(201, draw201));
      }
      return Promise.resolve(mockResponse(404, {}));
    });
    renderSection(true);

    await waitFor(() => expect(screen.getByRole("button", { name: "Realizar sorteio" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Realizar sorteio" }));

    const postCall = mockFetch.mock.calls.find(
      ([url, init]) => String(url).includes("/team-draw") && (init as RequestInit)?.method === "POST"
    );
    expect(postCall).toBeTruthy();
    const postBody = JSON.parse(String((postCall![1] as RequestInit).body));
    expect(postBody.balance_by_overall).toBe(true);
    expect(postBody.balance_goalkeepers).toBe(true);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Time A", level: 3 })).toBeInTheDocument()
    );
    expect(screen.getByText("João")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Time B", level: 3 })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Sorteio feito com sucesso.")).toBeInTheDocument()
    );
  });

  it("POST 201 no re-sortear atualiza times e feedback de sucesso", async () => {
    const initial = {
      draw_run_id: "run-aaa",
      pregame_id: "pg-1",
      num_teams: 2,
      seed_used: 1,
      balance_by_overall: true,
      is_confirmed: false,
      balance_goalkeepers: true,
      teams: [
        { id: "t1", name: "Time A", players: [{ participant_id: "p1", name: "João", overall: 8 }] },
        { id: "t2", name: "Time B", players: [{ participant_id: "p2", name: "Pedro", overall: 7 }] },
      ],
    };
    const afterReshuffle = {
      ...initial,
      draw_run_id: "run-bbb",
      seed_used: 2,
      teams: [
        { id: "t1", name: "Time A", players: [{ participant_id: "p2", name: "Pedro", overall: 7 }] },
        { id: "t2", name: "Time B", players: [{ participant_id: "p1", name: "João", overall: 8 }] },
      ],
    };
    mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";
      if (isMainTeamDrawUrl(url) && method === "GET") {
        return Promise.resolve(mockResponse(200, initial));
      }
      if (isMainTeamDrawUrl(url) && method === "POST") {
        return Promise.resolve(mockResponse(201, afterReshuffle));
      }
      return Promise.resolve(mockResponse(404, {}));
    });

    renderSection(true);
    await waitFor(() => expect(screen.getByText("João")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Ressortear" }));

    await waitFor(() => expect(screen.getByText("Pedro")).toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByText("Sorteio feito com sucesso.")).toBeInTheDocument()
    );

    const posts = mockFetch.mock.calls.filter(
      ([url, init]) => String(url).includes("/team-draw") && (init as RequestInit)?.method === "POST"
    );
    const reshuffleBody = JSON.parse(String((posts.at(-1)?.[1] as RequestInit).body));
    expect(reshuffleBody.balance_by_overall).toBe(true);
  });

  it("GET com balance_by_overall false deixa switch desligado", async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";
      if (isMainTeamDrawUrl(url) && method === "GET") {
        return Promise.resolve(
          mockResponse(200, {
            draw_run_id: "x1",
            pregame_id: "pg-1",
            num_teams: 2,
            seed_used: 1,
            balance_by_overall: false,
            is_confirmed: false,
            balance_goalkeepers: true,
            teams: [{ id: "t1", name: "Time A", players: [{ participant_id: "p1", name: "João", overall: 8 }] }],
          })
        );
      }
      return Promise.resolve(mockResponse(404, {}));
    });
    renderSection(true);
    await waitFor(() => expect(screen.getByRole("button", { name: "Opções do sorteio" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Opções do sorteio" }));
    await waitFor(() => expect(screen.getByRole("switch", { name: /Balancear por overall/i })).toBeInTheDocument());
    expect(screen.getByRole("switch", { name: /Balancear por overall/i })).toHaveAttribute("aria-checked", "false");
  });

  it("POST envia balance_by_overall false quando o switch está desligado", async () => {
    const body201 = {
      draw_run_id: "d1",
      pregame_id: "pg-1",
      num_teams: 2,
      seed_used: 1,
      balance_by_overall: false,
      is_confirmed: false,
      balance_goalkeepers: true,
      teams: [
        { id: "t1", name: "Time A", players: [{ participant_id: "p1", name: "João", overall: 8 }] },
        { id: "t2", name: "Time B", players: [{ participant_id: "p2", name: "Pedro", overall: 7 }] },
      ],
    };
    mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";
      if (isMainTeamDrawUrl(url) && method === "GET") {
        return Promise.resolve(mockResponse(404, {}));
      }
      if (isMainTeamDrawUrl(url) && method === "POST") {
        return Promise.resolve(mockResponse(201, body201));
      }
      return Promise.resolve(mockResponse(404, {}));
    });
    renderSection(true);
    await waitFor(() => expect(screen.getByRole("button", { name: "Realizar sorteio" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("switch", { name: /Balancear por overall/i }));
    await userEvent.click(screen.getByRole("button", { name: "Realizar sorteio" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Time A", level: 3 })).toBeInTheDocument()
    );
    const postCall = mockFetch.mock.calls.find(
      ([url, init]) => String(url).includes("/team-draw") && (init as RequestInit)?.method === "POST"
    );
    expect(JSON.parse(String((postCall![1] as RequestInit).body)).balance_by_overall).toBe(false);
  });

  it("POST com erro reverte num_teams para o sorteio anterior quando já havia times", async () => {
    const initial = {
      draw_run_id: "prev",
      pregame_id: "pg-1",
      num_teams: 2,
      seed_used: 1,
      balance_by_overall: true,
      is_confirmed: false,
      balance_goalkeepers: true,
      teams: [
        { id: "t1", name: "Time A", players: [{ participant_id: "p1", name: "João", overall: 8 }] },
        { id: "t2", name: "Time B", players: [{ participant_id: "p2", name: "Pedro", overall: 7 }] },
      ],
    };
    let postCount = 0;
    mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";
      if (isMainTeamDrawUrl(url) && method === "GET") {
        return Promise.resolve(mockResponse(200, initial));
      }
      if (isMainTeamDrawUrl(url) && method === "POST") {
        postCount += 1;
        if (postCount === 1) return Promise.resolve(mockResponse(403, { message: "nop" }));
        return Promise.resolve(mockResponse(201, initial));
      }
      return Promise.resolve(mockResponse(404, {}));
    });

    renderSection(true);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Opções do sorteio" })).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole("button", { name: "Opções do sorteio" }));
    await waitFor(() =>
      expect(document.getElementById("num-teams-settings-modal")).toBeInTheDocument()
    );
    const input = document.getElementById("num-teams-settings-modal") as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, "4");
    await userEvent.click(screen.getByTestId("team-draw-settings-close-footer"));
    await userEvent.click(screen.getByRole("button", { name: "Ressortear" }));

    await waitFor(() => expect(screen.getByText("Você não tem permissão para sortear.")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Opções do sorteio" }));
    await waitFor(() =>
      expect((document.getElementById("num-teams-settings-modal") as HTMLInputElement).value).toBe("2")
    );
  });

  it("mínimo não atingido pede confirmação e faz retry com force_below_min=true", async () => {
    const ok201 = {
      draw_run_id: "d2",
      pregame_id: "pg-1",
      num_teams: 2,
      seed_used: 321,
      balance_by_overall: true,
      is_confirmed: false,
      balance_goalkeepers: true,
      teams: [{ id: "t1", name: "Time A", players: [{ participant_id: "p1", name: "Rafa", overall: 9 }] }],
    };
    let postCount = 0;
    mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";
      if (isMainTeamDrawUrl(url) && method === "GET") {
        return Promise.resolve(mockResponse(404, {}));
      }
      if (isMainTeamDrawUrl(url) && method === "POST") {
        postCount += 1;
        if (postCount === 1) return Promise.resolve(mockResponse(400, { code: "team_draw_min_confirmed_not_reached" }));
        return Promise.resolve(mockResponse(201, ok201));
      }
      return Promise.resolve(mockResponse(404, {}));
    });

    renderSection(true);
    await waitFor(() => expect(screen.getByRole("button", { name: "Realizar sorteio" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Realizar sorteio" }));

    await waitFor(() => expect(screen.getByText("Mínimo de confirmados não atingido")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Continuar sorteio" }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Time A", level: 3 })).toBeInTheDocument()
    );
    const lastPost = mockFetch.mock.calls
      .filter(([url, init]) => String(url).includes("/team-draw") && (init as RequestInit)?.method === "POST")
      .at(-1);
    expect(lastPost).toBeTruthy();
    const payload = JSON.parse(String((lastPost?.[1] as RequestInit).body));
    expect(payload.force_below_min).toBe(true);
    expect(payload.balance_by_overall).toBe(true);
  });

  it("cancelar confirmação não dispara retry", async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";
      if (isMainTeamDrawUrl(url) && method === "GET") {
        return Promise.resolve(mockResponse(404, {}));
      }
      if (isMainTeamDrawUrl(url) && method === "POST") {
        return Promise.resolve(mockResponse(400, { code: "team_draw_min_confirmed_not_reached" }));
      }
      return Promise.resolve(mockResponse(404, {}));
    });

    renderSection(true);
    await waitFor(() => expect(screen.getByRole("button", { name: "Realizar sorteio" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Realizar sorteio" }));
    await waitFor(() => expect(screen.getByText("Mínimo de confirmados não atingido")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    const postCalls = mockFetch.mock.calls.filter(
      ([url, init]) => String(url).includes("/team-draw") && (init as RequestInit)?.method === "POST"
    );
    expect(postCalls.length).toBe(1);
  });

  it("copia texto para WhatsApp", async () => {
    const draw200 = {
      draw_run_id: "d1",
      pregame_id: "pg-1",
      num_teams: 2,
      seed_used: 123,
      balance_by_overall: true,
      is_confirmed: false,
      balance_goalkeepers: true,
      teams: [{ id: "t1", name: "Time A", players: [{ participant_id: "p1", name: "João", overall: 8 }] }],
    };
    mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";
      if (url.includes("/whatsapp-text")) {
        return Promise.resolve(mockResponse(200, { text: "*Times sorteados*" }));
      }
      if (isMainTeamDrawUrl(url) && method === "GET") {
        return Promise.resolve(mockResponse(200, draw200));
      }
      return Promise.resolve(mockResponse(404, {}));
    });

    renderSection(true);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Time A", level: 3 })).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole("button", { name: "Copiar para WhatsApp" }));

    await waitFor(() =>
      expect((navigator.clipboard.writeText as jest.MockedFunction<(text: string) => Promise<void>>))
        .toHaveBeenCalledWith("*Times sorteados*")
    );
  });

  it("mapeia erros principais de negócio", async () => {
    let postN = 0;
    mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";
      if (isMainTeamDrawUrl(url) && method === "GET") {
        return Promise.resolve(mockResponse(404, {}));
      }
      if (isMainTeamDrawUrl(url) && method === "POST") {
        postN += 1;
        if (postN === 1) return Promise.resolve(mockResponse(403, {}));
        if (postN === 2) return Promise.resolve(mockResponse(400, { code: "team_draw_num_teams_out_of_range" }));
        if (postN === 3) return Promise.resolve(mockResponse(400, { code: "team_draw_no_confirmed_participants" }));
        if (postN === 4) return Promise.resolve(mockResponse(422, {}));
        return Promise.resolve(mockResponse(500, {}));
      }
      return Promise.resolve(mockResponse(404, {}));
    });

    renderSection(true);
    await waitFor(() => expect(screen.getByRole("button", { name: "Realizar sorteio" })).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Realizar sorteio" }));
    await waitFor(() => expect(screen.getByText("Você não tem permissão para sortear.")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Realizar sorteio" }));
    await waitFor(() =>
      expect(screen.getByText(/Esse número de times não combina com a quantidade de confirmados/i)).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: "Realizar sorteio" }));
    await waitFor(() => expect(screen.getByText("Sem confirmados para sortear.")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Realizar sorteio" }));
    await waitFor(() =>
      expect(screen.getByText(/Alguns dados dos jogadores não batem com o esperado/i)).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: "Realizar sorteio" }));
    await waitFor(() => expect(screen.getByText(/tente novamente/i)).toBeInTheDocument());
  });

  it("422 com errors.general exibe mensagem do backend", async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";
      if (isMainTeamDrawUrl(url) && method === "GET") {
        return Promise.resolve(mockResponse(404, {}));
      }
      if (isMainTeamDrawUrl(url) && method === "POST") {
        return Promise.resolve(
          mockResponse(422, {
            errors: {
              general: ["Alguns confirmados estão sem métricas utilizáveis."],
              participant_ids: ["p-x"],
            },
          })
        );
      }
      return Promise.resolve(mockResponse(404, {}));
    });

    const onIds = jest.fn();
    render(
      <ConfirmProvider>
        <TeamDrawSection pregameId="pg-1" canManage={true} onTeamDrawValidationParticipants={onIds} />
      </ConfirmProvider>
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "Realizar sorteio" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Realizar sorteio" }));

    await waitFor(() =>
      expect(screen.getByText("Alguns confirmados estão sem métricas utilizáveis.")).toBeInTheDocument()
    );
    expect(onIds).toHaveBeenCalledWith(["p-x"]);
  });

  it("abre modal e move jogador via PATCH ao escolher outro time", async () => {
    const initial = {
      draw_run_id: "run-1",
      pregame_id: "pg-1",
      num_teams: 2,
      seed_used: 1,
      balance_by_overall: true,
      is_confirmed: false,
      balance_goalkeepers: true,
      teams: [
        {
          id: "t1",
          name: "Time A",
          players: [{ participant_id: "p1", name: "João", overall: 8 }],
        },
        {
          id: "t2",
          name: "Time B",
          players: [{ participant_id: "p2", name: "Pedro", overall: 7 }],
        },
      ],
    };
    const afterMove = {
      ...initial,
      teams: [
        { id: "t1", name: "Time A", players: [] },
        {
          id: "t2",
          name: "Time B",
          players: [
            { participant_id: "p2", name: "Pedro", overall: 7 },
            { participant_id: "p1", name: "João", overall: 8 },
          ],
        },
      ],
    };
    mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";
      if (isMainTeamDrawUrl(url) && method === "GET") {
        return Promise.resolve(mockResponse(200, initial));
      }
      if (url.includes("/assignments") && method === "PATCH") {
        return Promise.resolve(mockResponse(200, afterMove));
      }
      return Promise.resolve(mockResponse(404, {}));
    });

    renderSection(true);
    await waitFor(() => expect(screen.getByText("João")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Mover João para outro time/i }));

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Time B" }));

    await waitFor(() => expect(screen.getByText("Jogador movido.")).toBeInTheDocument());
    const patchCall = mockFetch.mock.calls.find(
      ([url, init]) => String(url).includes("/assignments") && (init as RequestInit)?.method === "PATCH"
    );
    expect(patchCall).toBeTruthy();
    expect(JSON.parse(String((patchCall![1] as RequestInit).body))).toEqual({
      participant_id: "p1",
      target_team_id: "t2",
    });
  });
});
