import { mapTeamDrawError } from "@/lib/mapTeamDrawError";

describe("mapTeamDrawError", () => {
  it("mapeia 404 no GET como estado vazio", () => {
    const out = mapTeamDrawError(404, {}, "get_draw");
    expect(out.kind).toBe("no_draw_yet");
  });

  it("mapeia erro de faixa de num_teams", () => {
    const out = mapTeamDrawError(400, { code: "team_draw_num_teams_out_of_range" }, "create_draw");
    expect(out.kind).toBe("num_teams_out_of_range");
    expect(out.field).toBe("num_teams");
    expect(out.message).toMatch(/confirmados/);
  });

  it("ignora message em inglês da API para num_teams", () => {
    const out = mapTeamDrawError(
      400,
      { code: "team_draw_num_teams_out_of_range", message: "num_teams is out of valid range" },
      "create_draw"
    );
    expect(out.message).not.toMatch(/num_teams|valid range/i);
    expect(out.message).toMatch(/confirmados/);
  });

  it("mapeia 422 como inconsistência de métricas", () => {
    const out = mapTeamDrawError(422, {}, "create_draw");
    expect(out.kind).toBe("metrics_inconsistency");
  });

  it("422 usa errors.general e participant_ids", () => {
    const out = mapTeamDrawError(
      422,
      {
        errors: {
          general: ["Revise as métricas dos jogadores listados."],
          participant_ids: ["part-1", "part-2"],
        },
      },
      "create_draw"
    );
    expect(out.message).toBe("Revise as métricas dos jogadores listados.");
    expect(out.participantIds).toEqual(["part-1", "part-2"]);
  });

  it("mapeia 500 como erro com retry", () => {
    const out = mapTeamDrawError(500, {}, "create_draw");
    expect(out.kind).toBe("server_error");
    expect(out.retryable).toBe(true);
  });
});
