import { backendFetch } from "@/lib/backend";

export type FlowRoute = "/dashboard" | "/cadastro" | "/cadastro?etapa=esportes";

/**
 * Verifica o status de registro do usuário autenticado e retorna para onde ele deve ser redirecionado.
 * Requer que o cookie de sessão (__session) já esteja definido.
 *
 * - Perfil incompleto (height_cm == 0) → "/cadastro"
 * - Perfil completo + survey pendente  → "/cadastro?etapa=esportes"
 * - Perfil completo + survey concluído → "/dashboard"
 * - Backend indisponível               → "/dashboard" (fail-open)
 */
export async function resolveRegistrationRoute(): Promise<FlowRoute> {
  try {
    const profileRes = await backendFetch("/api/v1/users/me", { method: "POST" });
    if (!profileRes.ok) return "/cadastro";

    const profileData = await profileRes.json().catch(() => null);
    const profileComplete = (profileData?.profile?.height_cm ?? 0) > 0;
    if (!profileComplete) return "/cadastro";

    const surveyRes = await backendFetch("/api/v1/marketingQuestions/survey-status");
    if (!surveyRes.ok) return "/dashboard";

    const surveyData = await surveyRes.json().catch(() => null);
    return surveyData?.is_completed ? "/dashboard" : "/cadastro?etapa=esportes";
  } catch {
    return "/dashboard";
  }
}
