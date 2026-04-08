# Plano de Cobertura de Testes — vamojogar-web

> Gerado em: 2026-03-27
> Cobertura atual: **0%** — nenhum arquivo de teste existe, nenhuma infraestrutura configurada.

---

## 1. Diagnóstico Geral

| Item | Status |
|---|---|
| Arquivos de teste (`.test.*`, `.spec.*`) | ❌ Nenhum |
| Jest / Vitest instalado | ❌ Não |
| Configuração de testes | ❌ Não existe |
| Script `test` no `package.json` | ❌ Não existe |
| Total de arquivos testáveis em `src/` | **67** |

---

## 2. Stack Recomendada

Para Next.js App Router com TypeScript:

```
jest                          # test runner
ts-jest                       # suporte a TypeScript
jest-environment-jsdom        # simula o DOM no Node
@testing-library/react        # render de componentes React
@testing-library/user-event   # simula interações de usuário
@testing-library/jest-dom     # matchers extras (.toBeInTheDocument etc)
msw                           # mock de fetch/API sem alterar código
next/jest                     # helper oficial do Next.js para Jest
```

### Instalação

```bash
npm install --save-dev \
  jest \
  ts-jest \
  jest-environment-jsdom \
  @testing-library/react \
  @testing-library/user-event \
  @testing-library/jest-dom \
  msw
```

### `jest.config.ts` (raiz do projeto)

```ts
import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterFramework: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

export default createJestConfig(config);
```

### `jest.setup.ts`

```ts
import "@testing-library/jest-dom";
```

### Script no `package.json`

```json
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

---

## 3. Prioridades de Cobertura

Classificados em 4 tiers por **risco de regressão** e **impacto no usuário**.

---

## TIER 1 — Crítico (implementar primeiro)

> Lógica pura de negócio, sem dependência de UI. Mais fácil de testar, maior impacto.

---

### `src/lib/registrationFlow.ts`

**O que faz:** Decide para onde redirecionar o usuário após login.
**Por que é crítico:** Erro aqui manda usuário para tela errada ou bloqueia acesso ao dashboard.

| # | Caso de Teste | Entrada | Esperado |
|---|---|---|---|
| 1 | Perfil incompleto | `height_cm = 0` | retorna `"/cadastro"` |
| 2 | Backend retorna 4xx | `profileRes.ok = false` | retorna `"/cadastro"` |
| 3 | Backend indisponível (throw) | fetch lança exceção | retorna `"/dashboard"` (fail-open) |
| 4 | Perfil completo + survey concluído | `height_cm > 0`, `is_completed = true` | retorna `"/dashboard"` |
| 5 | Perfil completo + survey pendente | `height_cm > 0`, `is_completed = false` | retorna `"/cadastro?etapa=esportes"` |
| 6 | Perfil completo + survey endpoint falha | `surveyRes.ok = false` | retorna `"/dashboard"` (fail-open) |
| 7 | Resposta do profile não é JSON válido | `res.json()` lança | retorna `"/cadastro"` |

**Como mockar:** Use `jest.mock("@/lib/backend")` para controlar retorno de `backendFetch`.

---

### `src/lib/proxyRoute.ts`

**O que faz:** Middleware utilizado por **todos os 35 route handlers** — verifica sessão, chama backend, normaliza erros.
**Por que é crítico:** Uma regressão aqui quebra todas as rotas da aplicação.

| # | Caso de Teste | Entrada | Esperado |
|---|---|---|---|
| 1 | Sem sessão | `getSession()` retorna `null` | retorna 401 com `type: "unauthorized"` |
| 2 | Backend indisponível | `backendFetch` lança | retorna 503 com `type: "connection_error"` |
| 3 | Backend retorna erro com body | `res.ok = false`, body com `title/type/message` | repassa os campos do backend |
| 4 | Backend retorna erro sem body legível | `res.json()` lança | usa `fallbackTitle`, `type: "server_error"` |
| 5 | Backend retorna 204 No Content | `res.status = 204` | retorna `{}` com `successStatus` |
| 6 | Backend retorna 200 com dados | `res.json()` resolve com payload | repassa payload com `successStatus` |
| 7 | Backend retorna erro com `errors` (validation) | body com `errors: { field: [...] }` | inclui `errors` no response |

---

### `src/lib/backend.ts`

**O que faz:** Toda requisição ao backend Go passa por aqui — injeta o Bearer token do cookie.

| # | Caso de Teste | Entrada | Esperado |
|---|---|---|---|
| 1 | Cookie presente | cookie `__session = "abc"` | header `Authorization: Bearer abc` |
| 2 | Cookie URL-encoded | cookie `__session = "abc%20def"` | token decodificado `"abc def"` |
| 3 | Cookie ausente | sem cookie | header `Authorization: Bearer ` (string vazia) |
| 4 | `init.headers` customizados | `headers: { "X-Custom": "val" }` | merge com Content-Type + Authorization |
| 5 | `Content-Type` não é sobrescrito | `init.headers` com `Content-Type` diferente | Authorization do cookie prevalece |

---

### `src/contexts/ErrorContext.tsx` — `parseBackendError`

**O que faz:** Função pura que extrai `{ title, type, message }` de uma `Response` de erro.

| # | Caso de Teste | Entrada | Esperado |
|---|---|---|---|
| 1 | Response com body completo | `{ title, type, message }` | retorna os campos exatos |
| 2 | Response com `errors` de validação | `{ errors: { name: ["required"] } }` | inclui `errors` no retorno |
| 3 | Response sem body / JSON inválido | `res.json()` lança | usa valores do `fallback` |
| 4 | Sem fallback e sem body | sem fallback, JSON inválido | usa defaults internos |
| 5 | Campo `title` ausente no body | body sem `title` | usa `fallback.title` |

---

## TIER 2 — Alto (implementar em seguida)

> Contextos React com estado + comportamentos interativos.

---

### `src/contexts/ErrorContext.tsx` — `ErrorProvider` + `useError`

| # | Caso de Teste | Descrição |
|---|---|---|
| 1 | `pushError` com tipo `unauthorized` | Deve chamar `router.push("/login")` e não adicionar ao stack |
| 2 | `pushError` com erro genérico | Deve adicionar ao array `errors` com `id` único |
| 3 | Máximo de 3 toasts | Quarto `pushError` descarta o mais antigo (slice(-2) + novo = 3) |
| 4 | `dismissError` remove pelo id | Após dismiss, o erro não aparece mais no array |
| 5 | `useError` fora do Provider | Deve lançar `Error("useError must be used within ErrorProvider")` |

---

### `src/contexts/ConfirmContext.tsx`

| # | Caso de Teste | Descrição |
|---|---|---|
| 1 | `confirm()` retorna `true` ao clicar em confirmar | Clique no botão de confirmar resolve a Promise com `true` |
| 2 | `confirm()` retorna `false` ao clicar em cancelar | Clique no botão de cancelar resolve com `false` |
| 3 | `confirm()` retorna `false` ao pressionar Esc | Evento `keydown` com `key: "Escape"` resolve com `false` |
| 4 | `confirm()` retorna `true` ao pressionar Enter | Evento `keydown` com `key: "Enter"` resolve com `true` |
| 5 | Clique no backdrop fecha com `false` | Clique fora do card resolve com `false` |
| 6 | Variante `danger` aplica classes vermelhas | Botão confirmar tem `bg-red-500` |
| 7 | Variante `warning` aplica classes âmbar | Botão confirmar tem `bg-amber-400` |
| 8 | Variante `info` aplica classes verdes | Botão confirmar tem `bg-green-500` |
| 9 | `detail` é renderizado quando presente | Pill com `label` e `value` aparece no modal |
| 10 | `useConfirm` fora do Provider | Deve lançar erro |

---

## TIER 3 — Médio (componentes complexos)

> Componentes com múltiplos estados, validações e chamadas de API internas.

---

### `src/app/cadastro/CadastroForm.tsx`

O componente mais complexo do projeto: 2 etapas, busca de CEP, survey de esportes, tracking de tempo.

**Step 1 — Dados pessoais:**

| # | Caso de Teste |
|---|---|
| 1 | Renderiza step 1 por padrão (`startAtSurvey = false`) |
| 2 | Renderiza step 2 diretamente quando `startAtSurvey = true` |
| 3 | Indicador de etapas mostra "1" ativo no step 1 |
| 4 | Busca CEP ao perder foco — preenche campos de endereço com sucesso |
| 5 | Exibe erro de CEP quando API retorna erro |
| 6 | Botão "Próximo passo" avança para step 2 |
| 7 | Campos obrigatórios bloqueiam avanço se vazios |

**Step 2 — Esportes:**

| # | Caso de Teste |
|---|---|
| 8 | Ao selecionar esporte, faz fetch das perguntas via `/api/marketingQuestions/[sport]` |
| 9 | Exibe spinner enquanto carrega perguntas |
| 10 | Renderiza perguntas de marketing após carga |
| 11 | Botão "Finalizar" fica desabilitado enquanto nem todas as perguntas foram respondidas |
| 12 | "+ Cadastrar novo esporte" adiciona nova seção |
| 13 | "Remover" remove a seção do esporte |
| 14 | Esporte já selecionado não aparece nas opções de outro esporte |
| 15 | Não mostra "+ Cadastrar novo esporte" quando todos os 5 esportes foram usados |

**Submissão:**

| # | Caso de Teste |
|---|---|
| 16 | `startAtSurvey = false`: chama `/api/cadastro` antes de salvar respostas |
| 17 | `startAtSurvey = true`: NÃO chama `/api/cadastro` |
| 18 | Salva respostas de cada esporte em sequência |
| 19 | Exibe erro se `/api/cadastro` falhar |
| 20 | Exibe erro se `/api/marketingQuestions/[sport]` (POST) falhar |
| 21 | Marca survey como `completed` com `time_to_answer_seconds` |
| 22 | Redireciona para `/dashboard` após sucesso |

---

### `src/app/grupos/novo/CreateGroupForm.tsx`

| # | Caso de Teste |
|---|---|
| 1 | Renderiza campos do formulário |
| 2 | Submissão chama `POST /api/groups` |
| 3 | Redireciona após criação com sucesso |
| 4 | Exibe erro de validação retornado pelo backend |
| 5 | Botão desabilitado durante submit |

---

### `src/app/invite/[token]/InviteClient.tsx`

| # | Caso de Teste |
|---|---|
| 1 | Renderiza dados do convite recebido por props |
| 2 | Botão "Aceitar" chama `POST /api/invitations/[token]/accept` |
| 3 | Redireciona para o grupo após aceitar |
| 4 | Exibe erro se aceite falhar |
| 5 | Exibe estado de loading durante aceite |

---

### `src/components/pregame/PreGamesSection.tsx`

| # | Caso de Teste |
|---|---|
| 1 | Renderiza lista de pregames recebida por props |
| 2 | Exibe estado vazio quando lista está vazia |
| 3 | Formata datas corretamente com `date-fns` |
| 4 | Link de cada pregame aponta para `/pregames/[id]` |

---

### `src/components/pregame/PendingInvites.tsx`

| # | Caso de Teste |
|---|---|
| 1 | Renderiza lista de convites pendentes |
| 2 | Não renderiza nada quando lista está vazia |
| 3 | Botão "Aceitar" chama endpoint correto |
| 4 | Botão "Recusar" chama endpoint correto |
| 5 | Remove o convite da lista após aceitar/recusar |
| 6 | Exibe erro se aceitar/recusar falhar |

---

## TIER 4 — Baixo (API Routes)

> Os 35 route handlers delegam quase tudo para `proxy()`. Cobertura de `proxyRoute.ts` (Tier 1) já cobre a maior parte. Testes aqui valem para casos específicos de cada rota.

**Rotas com lógica própria (além de proxy):**

| Arquivo | Lógica extra |
|---|---|
| `api/auth/callback/google/route.ts` | Fluxo de login completo: troca de code, criação de sessão, check de perfil + survey, redirect |
| `api/auth/session/route.DELETE` | Limpa cookie de sessão |
| `api/cadastro/route.ts` | Valida e formata body antes de enviar ao backend |

**Casos para `api/auth/callback/google/route.ts`:**

| # | Caso de Teste |
|---|---|
| 1 | Code ausente na query string → redireciona para `/login?error=...` |
| 2 | Troca de code falha → redireciona para `/login?error=...` |
| 3 | Perfil incompleto → redireciona para `/cadastro` |
| 4 | Perfil completo + survey pendente → redireciona para `/cadastro?etapa=esportes` |
| 5 | Perfil completo + survey concluído → redireciona para `/dashboard` |
| 6 | Backend de sync indisponível → redireciona para `/cadastro` (safe default) |

---

## 4. Resumo de Cobertura Esperada por Tier

| Tier | Arquivos | Testes estimados | Cobertura de risco |
|---|---|---|---|
| 1 — Crítico | 4 | ~35 | **Alta** |
| 2 — Alto | 2 | ~20 | **Alta** |
| 3 — Médio | 5 | ~45 | **Média** |
| 4 — API Routes | 3 (lógica própria) | ~15 | **Média** |
| **Total** | **14** | **~115** | — |

> Os 53 arquivos restantes (páginas thin, rotas que só delegam para `proxy()`) têm cobertura indireta pelos testes de Tier 1 e 4.

---

## 5. Ordem de Implementação Sugerida

```
Semana 1 — Infraestrutura + Tier 1
  [ ] Instalar dependências de teste
  [ ] Criar jest.config.ts + jest.setup.ts
  [ ] Adicionar script "test" no package.json
  [ ] Testes de registrationFlow.ts (7 casos)
  [ ] Testes de proxyRoute.ts (7 casos)
  [ ] Testes de backend.ts (5 casos)
  [ ] Testes de parseBackendError (5 casos)

Semana 2 — Tier 2
  [ ] Testes de ErrorProvider/useError (5 casos)
  [ ] Testes de ConfirmContext/useConfirm (10 casos)

Semana 3 — Tier 3
  [ ] Testes de CadastroForm.tsx (22 casos)
  [ ] Testes de CreateGroupForm.tsx (5 casos)
  [ ] Testes de InviteClient.tsx (5 casos)
  [ ] Testes de PreGamesSection.tsx (4 casos)
  [ ] Testes de PendingInvites.tsx (6 casos)

Semana 4 — Tier 4
  [ ] Testes de auth/callback/google (6 casos)
  [ ] Testes de demais rotas com lógica própria
```

---

## 6. Padrão de Mock Recomendado

### Mock de `fetch` com MSW

```ts
// __mocks__/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/marketingQuestions/:sport", () =>
    HttpResponse.json([
      { id: "q1", label: "Nível de experiência", options: ["Iniciante", "Intermediário", "Avançado"] },
    ])
  ),
];
```

### Mock de módulos internos

```ts
// Para registrationFlow.ts
jest.mock("@/lib/backend", () => ({
  backendFetch: jest.fn(),
}));

import { backendFetch } from "@/lib/backend";
const mockFetch = backendFetch as jest.MockedFunction<typeof backendFetch>;

mockFetch.mockResolvedValueOnce({
  ok: true,
  json: async () => ({ profile: { height_cm: 0 } }),
} as Response);
```

### Mock de `next/navigation`

```ts
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  redirect: jest.fn(),
}));
```

---

## 7. Cobertura Mínima Alvo

```json
// jest.config.ts — adicionar após infraestrutura estabilizada
"coverageThreshold": {
  "global": {
    "branches": 70,
    "functions": 75,
    "lines": 75,
    "statements": 75
  }
}
```
