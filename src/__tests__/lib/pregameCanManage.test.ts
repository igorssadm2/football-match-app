import { canManagePregame, groupSportFromPayload } from "@/lib/pregameCanManage";

describe("canManagePregame", () => {
  it("criador do pré-jogo", () => {
    expect(
      canManagePregame("u1", "u1", null)
    ).toBe(true);
  });

  it("admin do grupo", () => {
    expect(
      canManagePregame("u2", "other", {
        members: [{ user_id: "u2", role: "admin" }],
      })
    ).toBe(true);
  });

  it("dono pelo owner_id", () => {
    expect(
      canManagePregame("u3", "other", { owner_id: "u3" })
    ).toBe(true);
  });

  it("membro comum não gerencia", () => {
    expect(
      canManagePregame("u4", "other", {
        members: [{ user_id: "u4", role: "member" }],
      })
    ).toBe(false);
  });
});

describe("groupSportFromPayload", () => {
  it("lê settings.sport", () => {
    expect(groupSportFromPayload({ settings: { sport: "football" } })).toBe("football");
  });

  it("undefined se vazio", () => {
    expect(groupSportFromPayload({ settings: {} })).toBeUndefined();
  });
});
