import { mapAddGuestError } from "@/lib/mapAddGuestError";

describe("mapAddGuestError", () => {
  it("409 duplicado", () => {
    const r = mapAddGuestError(409, {});
    expect(r.toastMessage).toMatch(/já está neste pré-jogo/i);
  });

  it("400 group_sport_not_set", () => {
    const r = mapAddGuestError(400, { code: "group_sport_not_set" });
    expect(r.toastMessage).toMatch(/esporte do grupo/i);
  });

  it("422 com errors map", () => {
    const r = mapAddGuestError(422, {
      errors: { manual_profile_id: ["não pode ser combinado"] },
    });
    expect(r.toastMessage).toContain("manual_profile_id");
  });

  it("422 com skill_ratings aninhado", () => {
    const r = mapAddGuestError(422, {
      errors: { skill_ratings: { finishing: ["nota inválida"] } },
    });
    expect(r.toastMessage).toMatch(/finishing/i);
    expect(r.skillRatingsHint).toMatch(/finishing/i);
  });

  // --- Corner cases: status codes mapeados na implementação mas sem teste ---

  it("401 não autorizado", () => {
    const r = mapAddGuestError(401, {});
    expect(r.toastMessage).toMatch(/login/i);
  });

  it("403 proibido", () => {
    const r = mapAddGuestError(403, {});
    expect(r.toastMessage).toMatch(/permissão/i);
  });

  it("404 com resource manual_profile", () => {
    const r = mapAddGuestError(404, { resource: "manual_profile" });
    expect(r.toastMessage).toMatch(/perfil manual/i);
  });

  it("404 sem resource retorna mensagem genérica", () => {
    const r = mapAddGuestError(404, {});
    expect(r.toastMessage).toMatch(/não encontrado/i);
  });

  it("400 manual_profile_group_mismatch", () => {
    const r = mapAddGuestError(400, { code: "manual_profile_group_mismatch" });
    expect(r.toastMessage).toMatch(/não pertence a este grupo/i);
  });

  it("422 com message contendo 'cheio' → lotação esgotada", () => {
    const r = mapAddGuestError(422, { message: "O jogo está cheio." });
    expect(r.toastMessage).toMatch(/cheio/i);
  });

  it("422 com message contendo 'lista de espera'", () => {
    const r = mapAddGuestError(422, { message: "Você foi adicionado à lista de espera." });
    expect(r.toastMessage).toMatch(/lista de espera/i);
  });

  it("400 com message contendo 'nome' retorna inlineHint", () => {
    const r = mapAddGuestError(400, { message: "O campo nome é obrigatório." });
    expect(r.inlineHint).toBeTruthy();
  });

  it("500 → servidor indisponível", () => {
    const r = mapAddGuestError(500, {});
    expect(r.toastMessage).toMatch(/indisponível/i);
  });

  it("status desconhecido → mensagem genérica", () => {
    const r = mapAddGuestError(418, {});
    expect(r.toastMessage).toBeTruthy();
  });
});
