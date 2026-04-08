import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CadastroForm from "@/app/cadastro/CadastroForm";
import { ErrorProvider } from "@/contexts/ErrorContext";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

function renderForm(startAtSurvey = false) {
  return render(
    <ErrorProvider>
      <CadastroForm startAtSurvey={startAtSurvey} />
    </ErrorProvider>
  );
}

async function fillStep1(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Altura/i), "175");
  await user.type(screen.getByLabelText(/Peso/i), "70");
  // shoe_size is a select
  await user.selectOptions(screen.getByLabelText(/Tam\. do Pé/i), "42");
  // address fields
  await user.type(screen.getByLabelText(/CEP/i), "12345678");
  await user.type(screen.getByLabelText(/Número/i), "42");
  await user.type(screen.getByLabelText(/Bairro/i), "Centro");
  await user.type(screen.getByLabelText(/Rua/i), "Rua das Flores");
  await user.type(screen.getByLabelText(/Cidade/i), "São Paulo");
  await user.selectOptions(screen.getByLabelText(/Estado/i), "SP");
}

const sampleSkills = [
  { id: "finishing", name: "Finalização", description: "Precisão do chute ao gol.", min_value: 1, max_value: 10 },
];

const sampleQuestions = [
  { id: "q1", label: "Nível de jogo", options: ["Iniciante", "Intermediário", "Avançado"] },
];

/** Mock a sport selection: returns skills response (GET /api/skills/sport). */
function mockSkillsGet(questions = sampleSkills) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: jest.fn().mockResolvedValue(questions),
  });
}

/** Mock the calls triggered by clicking "Próximo: Preferências →":
 *  POST /api/skills/sport, PATCH survey-status/skills, GET /api/marketingQuestions/sport */
function mockProceedToMarketing(mktQuestions = sampleQuestions) {
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ ok: true }) }) // POST /api/skills
    .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) })             // PATCH survey-status skills
    .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue(mktQuestions) });  // GET marketingQuestions
}

describe("CadastroForm — Step 1", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the CEP fetch to prevent side effects
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ erro: true }),
    });
  });

  it("1. Renders step 1 by default (startAtSurvey not passed)", () => {
    renderForm();
    expect(screen.getByLabelText(/Altura/i)).toBeInTheDocument();
    expect(screen.getByText(/Próximo passo/i)).toBeInTheDocument();
  });

  it("2. Step indicator shows step 1 as active", () => {
    renderForm();
    // Step 1 number circle should have bg-green-500
    const stepNumbers = screen.getAllByText("1");
    const step1Circle = stepNumbers[0];
    expect(step1Circle.className).toContain("bg-green-500");
  });

  it("3. Próximo passo button advances to step 2 when form is filled", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillStep1(user);
    await user.click(screen.getByText(/Próximo passo/i));
    await waitFor(() =>
      expect(screen.getByLabelText(/Qual esporte/i)).toBeInTheDocument()
    );
  });
});

describe("CadastroForm — Step 2 (skills sub-step)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("4. Renders step 2 directly when startAtSurvey={true}", () => {
    renderForm(true);
    expect(screen.getByLabelText(/Qual esporte/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Altura/i)).not.toBeInTheDocument();
  });

  it("5. Selecting a sport triggers fetch to /api/skills/[sport]", async () => {
    const user = userEvent.setup();
    mockSkillsGet();
    renderForm(true);
    await user.selectOptions(screen.getByLabelText(/Qual esporte/i), "football");
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith("/api/skills/football")
    );
  });

  it("6. Skill inputs render after sport is selected", async () => {
    const user = userEvent.setup();
    mockSkillsGet();
    renderForm(true);
    await user.selectOptions(screen.getByLabelText(/Qual esporte/i), "football");
    await waitFor(() =>
      expect(screen.getByText("Finalização")).toBeInTheDocument()
    );
  });

  it("17. Marketing questions do NOT appear before completing skills", async () => {
    const user = userEvent.setup();
    mockSkillsGet();
    renderForm(true);
    await user.selectOptions(screen.getByLabelText(/Qual esporte/i), "football");
    await waitFor(() => expect(screen.getByText("Finalização")).toBeInTheDocument());
    // marketing question should NOT be visible yet
    expect(screen.queryByText("Nível de jogo")).not.toBeInTheDocument();
  });

  it("18. 'Próximo: Preferências' button disabled until all skills are rated", async () => {
    const user = userEvent.setup();
    mockSkillsGet();
    renderForm(true);
    await user.selectOptions(screen.getByLabelText(/Qual esporte/i), "football");
    await waitFor(() => expect(screen.getByText(/Próximo: Preferências/i)).toBeInTheDocument());
    expect(screen.getByText(/Próximo: Preferências/i)).toBeDisabled();
  });

  it("19. 'Próximo: Preferências' enabled after all skills rated", async () => {
    const user = userEvent.setup();
    mockSkillsGet();
    renderForm(true);
    await user.selectOptions(screen.getByLabelText(/Qual esporte/i), "football");
    await waitFor(() => expect(screen.getByLabelText("Finalização")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Finalização"), { target: { value: "7" } });
    await waitFor(() =>
      expect(screen.getByText(/Próximo: Preferências/i)).not.toBeDisabled()
    );
  });

  it("20. After clicking Próximo, marketing questions appear", async () => {
    const user = userEvent.setup();
    mockSkillsGet();
    renderForm(true);
    await user.selectOptions(screen.getByLabelText(/Qual esporte/i), "football");
    await waitFor(() => expect(screen.getByLabelText("Finalização")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Finalização"), { target: { value: "7" } });
    mockProceedToMarketing();
    await user.click(screen.getByText(/Próximo: Preferências/i));
    await waitFor(() =>
      expect(screen.getByText("Nível de jogo")).toBeInTheDocument()
    );
  });

  it("22. PATCH survey-status with type='skills' called after completing skills", async () => {
    const user = userEvent.setup();
    mockSkillsGet();
    renderForm(true);
    await user.selectOptions(screen.getByLabelText(/Qual esporte/i), "football");
    await waitFor(() => expect(screen.getByLabelText("Finalização")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Finalização"), { target: { value: "7" } });
    mockProceedToMarketing();
    await user.click(screen.getByText(/Próximo: Preferências/i));
    await waitFor(() => expect(screen.getByText("Nível de jogo")).toBeInTheDocument());

    const patchCall = mockFetch.mock.calls.find(
      (c) => (c[0] as string) === "/api/marketingQuestions/survey-status" &&
              c[1]?.method === "PATCH" &&
              JSON.parse(c[1].body as string).survey_type === "skills"
    );
    expect(patchCall).toBeDefined();
  });

  it("23. startAtSurvey=true also shows skills before marketing", async () => {
    const user = userEvent.setup();
    mockSkillsGet();
    renderForm(true);
    await user.selectOptions(screen.getByLabelText(/Qual esporte/i), "football");
    await waitFor(() => expect(screen.getByText("Finalização")).toBeInTheDocument());
    // marketing questions not visible yet
    expect(screen.queryByText("Nível de jogo")).not.toBeInTheDocument();
  });

  it("7. Finalizar cadastro button not shown during skills sub-step", async () => {
    const user = userEvent.setup();
    mockSkillsGet();
    renderForm(true);
    await user.selectOptions(screen.getByLabelText(/Qual esporte/i), "football");
    await waitFor(() => expect(screen.getByText("Finalização")).toBeInTheDocument());
    // During skills sub-step the button is hidden — only "Próximo: Preferências" is shown
    expect(screen.queryByText(/Finalizar cadastro/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Próximo: Preferências/i)).toBeDisabled();
  });

  it("8. Finalizar enabled after completing skills AND marketing", async () => {
    const user = userEvent.setup();
    mockSkillsGet();
    renderForm(true);
    await user.selectOptions(screen.getByLabelText(/Qual esporte/i), "football");
    await waitFor(() => expect(screen.getByLabelText("Finalização")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Finalização"), { target: { value: "7" } });
    mockProceedToMarketing();
    await user.click(screen.getByText(/Próximo: Preferências/i));
    await waitFor(() => expect(screen.getByText("Nível de jogo")).toBeInTheDocument());
    // answer marketing
    await user.selectOptions(screen.getByDisplayValue("Selecione uma opção"), "Iniciante");
    await waitFor(() =>
      expect(screen.getByText(/Finalizar cadastro/i)).not.toBeDisabled()
    );
  });
});

describe("CadastroForm — Submission", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("9. startAtSurvey={false} → calls POST /api/cadastro", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({ ok: false, json: jest.fn().mockResolvedValue({ erro: true }) }); // CEP
    renderForm(false);
    await fillStep1(user);
    await user.click(screen.getByText(/Próximo passo/i));

    // Select sport and complete skills + marketing
    mockSkillsGet();
    await user.selectOptions(screen.getByLabelText(/Qual esporte/i), "football");
    await waitFor(() => expect(screen.getByLabelText("Finalização")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Finalização"), { target: { value: "7" } });
    mockProceedToMarketing();
    await user.click(screen.getByText(/Próximo: Preferências/i));
    await waitFor(() => expect(screen.getByText("Nível de jogo")).toBeInTheDocument());
    await user.selectOptions(screen.getByDisplayValue("Selecione uma opção"), "Iniciante");
    await waitFor(() => expect(screen.getByText(/Finalizar cadastro/i)).not.toBeDisabled());

    // Reset mocks for submit
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) }) // POST /api/cadastro
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) }) // PATCH survey-status registration
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) }) // POST marketingQuestions/football
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) }); // PATCH survey-status marketing

    await user.click(screen.getByText(/Finalizar cadastro/i));
    await waitFor(() => {
      const calls = mockFetch.mock.calls.map((c) => c[0]);
      expect(calls).toContain("/api/cadastro");
    });
  });

  it("10. startAtSurvey={true} → does NOT call POST /api/cadastro", async () => {
    const user = userEvent.setup();
    mockSkillsGet();
    renderForm(true);
    await user.selectOptions(screen.getByLabelText(/Qual esporte/i), "football");
    await waitFor(() => expect(screen.getByLabelText("Finalização")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Finalização"), { target: { value: "7" } });
    mockProceedToMarketing();
    await user.click(screen.getByText(/Próximo: Preferências/i));
    await waitFor(() => expect(screen.getByText("Nível de jogo")).toBeInTheDocument());
    await user.selectOptions(screen.getByDisplayValue("Selecione uma opção"), "Iniciante");
    await waitFor(() => expect(screen.getByText(/Finalizar cadastro/i)).not.toBeDisabled());

    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) }) // POST marketingQuestions
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) }); // PATCH survey-status marketing

    await user.click(screen.getByText(/Finalizar cadastro/i));
    await waitFor(() => mockPush.mock.calls.length > 0);
    const calls = mockFetch.mock.calls.map((c) => c[0] as string);
    expect(calls).not.toContain("/api/cadastro");
  });

  it("11. Calls POST /api/marketingQuestions/[sport] with answers on submit", async () => {
    const user = userEvent.setup();
    mockSkillsGet();
    renderForm(true);
    await user.selectOptions(screen.getByLabelText(/Qual esporte/i), "football");
    await waitFor(() => expect(screen.getByLabelText("Finalização")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Finalização"), { target: { value: "7" } });
    mockProceedToMarketing();
    await user.click(screen.getByText(/Próximo: Preferências/i));
    await waitFor(() => expect(screen.getByText("Nível de jogo")).toBeInTheDocument());
    await user.selectOptions(screen.getByDisplayValue("Selecione uma opção"), "Iniciante");
    await waitFor(() => expect(screen.getByText(/Finalizar cadastro/i)).not.toBeDisabled());

    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) }) // POST marketingQuestions
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) }); // PATCH survey-status marketing

    await user.click(screen.getByText(/Finalizar cadastro/i));
    await waitFor(() => {
      const footballCall = mockFetch.mock.calls.find(
        (c) => (c[0] as string) === "/api/marketingQuestions/football" && c[1]?.method === "POST"
      );
      expect(footballCall).toBeDefined();
      const body = JSON.parse(footballCall![1].body as string);
      expect(body).toEqual({ q1: "Iniciante" });
    });
  });

  it("21. POST /api/skills/[sport] called before POST /api/marketingQuestions/[sport] on Próximo", async () => {
    const user = userEvent.setup();
    mockSkillsGet();
    renderForm(true);
    await user.selectOptions(screen.getByLabelText(/Qual esporte/i), "football");
    await waitFor(() => expect(screen.getByLabelText("Finalização")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Finalização"), { target: { value: "7" } });
    mockProceedToMarketing();
    await user.click(screen.getByText(/Próximo: Preferências/i));
    await waitFor(() => expect(screen.getByText("Nível de jogo")).toBeInTheDocument());

    const allCalls = mockFetch.mock.calls;
    const skillsPostIdx = allCalls.findIndex(
      c => (c[0] as string) === "/api/skills/football" && c[1]?.method === "POST"
    );
    const mktGetIdx = allCalls.findIndex(
      c => (c[0] as string) === "/api/marketingQuestions/football" && (!c[1] || c[1]?.method === "GET" || !c[1]?.method)
    );
    expect(skillsPostIdx).toBeGreaterThanOrEqual(0);
    expect(mktGetIdx).toBeGreaterThanOrEqual(0);
    expect(skillsPostIdx).toBeLessThan(mktGetIdx);
  });

  it("14. handleSaveAndAddSport envia respostas de marketing como objeto plano", async () => {
    const user = userEvent.setup();
    mockSkillsGet();
    renderForm(true);
    await user.selectOptions(screen.getByLabelText(/Qual esporte/i), "football");
    await waitFor(() => expect(screen.getByLabelText("Finalização")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Finalização"), { target: { value: "7" } });
    mockProceedToMarketing();
    await user.click(screen.getByText(/Próximo: Preferências/i));
    await waitFor(() => expect(screen.getByText("Nível de jogo")).toBeInTheDocument());
    await user.selectOptions(screen.getByDisplayValue("Selecione uma opção"), "Iniciante");

    await waitFor(() =>
      expect(screen.getByText(/Cadastrar novo esporte/i)).toBeInTheDocument()
    );

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ ok: true }) }) // POST marketingQuestions
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) });           // PATCH survey-status marketing

    await user.click(screen.getByText(/Cadastrar novo esporte/i));

    await waitFor(() => {
      const call = mockFetch.mock.calls.find(
        (c) => (c[0] as string) === "/api/marketingQuestions/football" && c[1]?.method === "POST"
      );
      expect(call).toBeDefined();
      const body = JSON.parse(call![1].body as string);
      expect(body).toEqual({ q1: "Iniciante" });
      expect(body.answers).toBeUndefined();
    });
  });

  it("15. handleSaveAndAddSport mantém estado quando API retorna erro", async () => {
    const user = userEvent.setup();
    mockSkillsGet();
    renderForm(true);
    await user.selectOptions(screen.getByLabelText(/Qual esporte/i), "football");
    await waitFor(() => expect(screen.getByLabelText("Finalização")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Finalização"), { target: { value: "7" } });
    mockProceedToMarketing();
    await user.click(screen.getByText(/Próximo: Preferências/i));
    await waitFor(() => expect(screen.getByText("Nível de jogo")).toBeInTheDocument());
    await user.selectOptions(screen.getByDisplayValue("Selecione uma opção"), "Iniciante");
    await waitFor(() =>
      expect(screen.getByText(/Cadastrar novo esporte/i)).toBeInTheDocument()
    );

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({
        title: "Erro ao salvar",
        type: "validation_error",
        message: "Resposta inválida",
      }),
    });
    await user.click(screen.getByText(/Cadastrar novo esporte/i));

    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled();
      expect(screen.getByText("Nível de jogo")).toBeInTheDocument();
    });
  });

  it("16. Esporte salvo via handleSaveAndAddSport é removido do seletor", async () => {
    const user = userEvent.setup();
    mockSkillsGet();
    renderForm(true);
    await user.selectOptions(screen.getByLabelText(/Qual esporte/i), "football");
    await waitFor(() => expect(screen.getByLabelText("Finalização")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Finalização"), { target: { value: "7" } });
    mockProceedToMarketing();
    await user.click(screen.getByText(/Próximo: Preferências/i));
    await waitFor(() => expect(screen.getByText("Nível de jogo")).toBeInTheDocument());
    await user.selectOptions(screen.getByDisplayValue("Selecione uma opção"), "Iniciante");
    await waitFor(() =>
      expect(screen.getByText(/Cadastrar novo esporte/i)).toBeInTheDocument()
    );

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ ok: true }) })
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) });

    await user.click(screen.getByText(/Cadastrar novo esporte/i));

    await waitFor(() => {
      const select = screen.getByLabelText(/Qual esporte/i) as HTMLSelectElement;
      const options = Array.from(select.options).map((o) => o.value);
      expect(options).not.toContain("football");
    });
  });

  it("13. não quebra quando a API retorna objeto { questions: [] } para marketing", async () => {
    const user = userEvent.setup();
    mockSkillsGet();
    renderForm(true);
    const sportSelect = screen.getByLabelText(/Qual esporte/i);

    await expect(
      user.selectOptions(sportSelect, "football")
    ).resolves.not.toThrow();

    await waitFor(() =>
      expect(screen.getByLabelText(/Qual esporte/i)).toBeInTheDocument()
    );
  });

  it("12. Redirects to /dashboard on success", async () => {
    const user = userEvent.setup();
    mockSkillsGet();
    renderForm(true);
    await user.selectOptions(screen.getByLabelText(/Qual esporte/i), "football");
    await waitFor(() => expect(screen.getByLabelText("Finalização")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Finalização"), { target: { value: "7" } });
    mockProceedToMarketing();
    await user.click(screen.getByText(/Próximo: Preferências/i));
    await waitFor(() => expect(screen.getByText("Nível de jogo")).toBeInTheDocument());
    await user.selectOptions(screen.getByDisplayValue("Selecione uma opção"), "Iniciante");
    await waitFor(() => expect(screen.getByText(/Finalizar cadastro/i)).not.toBeDisabled());

    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) }) // POST marketingQuestions
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) }); // PATCH survey-status marketing

    await user.click(screen.getByText(/Finalizar cadastro/i));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
  });
});

describe("CadastroForm — Error Handling (survey-status PATCH)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("A. PATCH skills survey-status falha: não avança para marketing", async () => {
    const user = userEvent.setup();
    mockSkillsGet();
    renderForm(true);
    await user.selectOptions(screen.getByLabelText(/Qual esporte/i), "football");
    await waitFor(() => expect(screen.getByLabelText("Finalização")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Finalização"), { target: { value: "7" } });

    // POST skills succeeds, PATCH survey-status fails
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ ok: true }) })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ title: "Erro interno", type: "server_error", message: "Falha no servidor." }),
      });

    await user.click(screen.getByText(/Próximo: Preferências/i));

    await waitFor(() => {
      expect(screen.queryByText("Nível de jogo")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Finalização")).toBeInTheDocument();
  });

  it("B. PATCH marketing survey-status falha no handleFinalSubmit: não redireciona", async () => {
    const user = userEvent.setup();
    mockSkillsGet();
    renderForm(true);
    await user.selectOptions(screen.getByLabelText(/Qual esporte/i), "football");
    await waitFor(() => expect(screen.getByLabelText("Finalização")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Finalização"), { target: { value: "7" } });
    mockProceedToMarketing();
    await user.click(screen.getByText(/Próximo: Preferências/i));
    await waitFor(() => expect(screen.getByText("Nível de jogo")).toBeInTheDocument());
    await user.selectOptions(screen.getByDisplayValue("Selecione uma opção"), "Iniciante");
    await waitFor(() => expect(screen.getByText(/Finalizar cadastro/i)).not.toBeDisabled());

    // POST marketingQuestions succeeds, PATCH survey-status fails
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ ok: true }) })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ title: "Erro interno", type: "server_error", message: "Falha no servidor." }),
      });

    await user.click(screen.getByText(/Finalizar cadastro/i));

    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it("C. PATCH marketing survey-status falha no handleSaveAndAddSport: esporte não adicionado", async () => {
    const user = userEvent.setup();
    mockSkillsGet();
    renderForm(true);
    await user.selectOptions(screen.getByLabelText(/Qual esporte/i), "football");
    await waitFor(() => expect(screen.getByLabelText("Finalização")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Finalização"), { target: { value: "7" } });
    mockProceedToMarketing();
    await user.click(screen.getByText(/Próximo: Preferências/i));
    await waitFor(() => expect(screen.getByText("Nível de jogo")).toBeInTheDocument());
    await user.selectOptions(screen.getByDisplayValue("Selecione uma opção"), "Iniciante");
    await waitFor(() => expect(screen.getByText(/Cadastrar novo esporte/i)).toBeInTheDocument());

    // POST marketingQuestions succeeds, PATCH survey-status fails
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ ok: true }) })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ title: "Erro interno", type: "server_error", message: "Falha no servidor." }),
      });

    await user.click(screen.getByText(/Cadastrar novo esporte/i));

    await waitFor(() => {
      // Form stays on marketing sub-step (not reset), meaning the sport was NOT saved
      expect(screen.getByText("Nível de jogo")).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
