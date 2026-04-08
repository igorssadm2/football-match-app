import {
  buildCompleteFootballSkillRatings,
  hasAllFootballSkillDefinitions,
  isCompleteFootballSkillRatings,
} from "@/lib/footballSkills";
import type { SkillDefinition } from "@/types/pregame";

const defs: SkillDefinition[] = [
  { id: "finishing", name: "Finalização", min_value: 1, max_value: 10 },
  { id: "passing", name: "Passe", min_value: 1, max_value: 10 },
  { id: "ball_control", name: "Condução", min_value: 1, max_value: 10 },
  { id: "positioning", name: "Posicionamento", min_value: 1, max_value: 10 },
  { id: "physicality", name: "Físico", min_value: 1, max_value: 10 },
];

describe("footballSkills", () => {
  it("hasAllFootballSkillDefinitions", () => {
    expect(hasAllFootballSkillDefinitions(defs)).toBe(true);
    expect(hasAllFootballSkillDefinitions(defs.slice(0, 3))).toBe(false);
  });

  it("buildCompleteFootballSkillRatings arredonda e limita", () => {
    const out = buildCompleteFootballSkillRatings(defs, { finishing: 11, passing: 0 });
    expect(out.finishing).toBe(10);
    expect(out.passing).toBe(1);
    expect(Object.keys(out).sort()).toEqual(
      ["ball_control", "finishing", "passing", "physicality", "positioning"].sort()
    );
  });

  it("isCompleteFootballSkillRatings", () => {
    const full = buildCompleteFootballSkillRatings(defs, {});
    expect(isCompleteFootballSkillRatings(full, defs)).toBe(true);
    expect(isCompleteFootballSkillRatings({ finishing: 5 }, defs)).toBe(false);
  });
});
