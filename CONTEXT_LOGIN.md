# Contexto: Autenticação Manual (Email + Senha)

## Status: **Frontend pendente — backend 100% pronto | Plano de ação definido**

O backend já expõe os endpoints de cadastro e login manual. O frontend ainda só suporta login via Google.

---

## Como a auth funciona hoje (web)

1. Usuário clica "Continuar com Google" em `/login`.
2. Redireciona para `/api/auth/google` → OAuth Google → `/api/auth/callback`.
3. Callback troca o code por um token Firebase, salva sessão via cookie httpOnly.
4. A sessão (`getSession()`) retorna `{ name, email, picture, firebaseUID, token }`.
5. O token Firebase é enviado como `Authorization: Bearer <token>` para o backend.
6. Cadastro de perfil/esporte fica em `/cadastro` (pós-login, requer sessão ativa).

**Arquivos chave:**
- `src/app/api/auth/google/` — inicia OAuth
- `src/app/api/auth/callback/` — finaliza OAuth, cria sessão
- `src/app/api/auth/session/` — lê sessão do cookie
- `src/lib/firebase/session.ts` — helper `getSession()`
- `src/lib/registrationFlow.ts` — decide se usuário vai para `/cadastro` ou `/dashboard`
- `src/app/login/page.tsx` — só tem botão Google atualmente

---

## O que o backend disponibiliza para auth manual

| Método | URL | Body | Resposta |
|---|---|---|---|
| POST | `/api/v1/auth/register` | `{ name, email, password }` | `{ token, user }` — token JWT próprio |
| POST | `/api/v1/auth/login` | `{ email, password }` | `{ token, user }` — token JWT próprio |

O token retornado é HMAC-HS256, campo `user_id` no payload. É aceito por todos os endpoints `/api/v1/users/*` (o `AnyAuthMiddleware` no backend reconhece tokens com `iss: "vamojogar"`).

---

## O que precisa ser implementado no frontend

### 1. Rotas proxy Next.js para auth manual
Criar em `src/app/api/auth/`:

**`manual-register/route.ts`**
- Recebe `{ name, email, password }`.
- Faz POST para o backend `/api/v1/auth/register`.
- Salva o token retornado na sessão (cookie httpOnly, mesmo formato do fluxo Google).
- Redireciona para `/cadastro`.

**`manual-login/route.ts`**
- Recebe `{ email, password }`.
- Faz POST para o backend `/api/v1/auth/login`.
- Salva o token na sessão.
- Redireciona para destino (dashboard ou redirect param).

### 2. Formulário de cadastro manual
- Pode ser uma nova página `/cadastro-manual` ou um modal/tab em `/login`.
- Campos: Nome, Email, Senha (mín. 8 chars), Confirmar senha.
- Chama `/api/auth/manual-register`.

### 3. Formulário de login manual
- Adicionar tab "Email/senha" na página `/login` existente, ao lado do botão Google.
- Campos: Email, Senha.
- Chama `/api/auth/manual-login`.

### 4. Adaptar `getSession()` e `registrationFlow.ts`
- O token manual não é um token Firebase — verificar se `getSession()` / `resolveRegistrationRoute()` funciona com ele ou precisa de branch.
- O backend retorna junto um objeto `user` com `{ id, name, email, firebase_uid, auth_providers }` — usar para preencher a sessão.

---

## Fluxo de vinculação automática (transparente ao usuário)

Se o usuário criou conta manual e depois loga via Google com o mesmo email:
- O backend detecta automaticamente e vincula as contas (`sync_identity`).
- Nenhuma ação extra no frontend é necessária — o fluxo Google já existente cuida disso.

---

## Erros esperados do backend (para tratar no frontend)

| HTTP | Código | Situação |
|---|---|---|
| 409 | `conflict` | Email já cadastrado (register) |
| 404 | `not_found` | Email não encontrado (login) |
| 401 | `unauthorized` | Senha incorreta (login) |
| 422 | `validation_error` | Campos inválidos (email formato, senha < 8 chars) |
| 400 | `email_login_not_available` | Usuário existe mas só tem login Google |

---

## Referências no codebase

- `src/app/login/page.tsx` — página de login (só Google hoje)
- `src/app/api/auth/google/` — modelo para criar rotas de auth manual
- `src/lib/firebase/session.ts` — lógica de sessão (adaptar para token manual)
- `src/lib/backend.ts` — cliente HTTP para o backend (adicionar chamadas de auth manual)

---

## Plano de ação — implementação frontend

### Visão geral das mudanças

```
src/
├── lib/firebase/session.ts           ← MODIFICAR: suporte a token manual
├── app/
│   ├── login/page.tsx                ← MODIFICAR: adicionar formulários email/senha
│   └── api/auth/
│       ├── manual/
│       │   ├── register/route.ts     ← CRIAR: proxy cadastro manual
│       │   └── login/route.ts        ← CRIAR: proxy login manual
│       └── logout/route.ts           ← CRIAR (ou já existe): limpar __session_user também
```

---

### Etapa 1 — Adaptar `src/lib/firebase/session.ts`

**Problema:** `getAdminAuth().verifyIdToken(token)` só aceita tokens Firebase. Tokens manuais (`iss: "vamojogar"`) vão lançar exceção e `getSession()` retorna `null`, impedindo acesso a qualquer página protegida.

**Solução:** Antes de tentar o Firebase, decodificar o payload JWT (base64url) e checar o `iss`. Tokens manuais têm apenas `user_id` no payload — nome e email são recuperados de um cookie auxiliar `__session_user` salvo pelas rotas de auth manual.

**Mudança em `getSession()`:**
```typescript
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const token = decodeURIComponent(raw);

  // 1. Verificar se é token manual (iss: "vamojogar")
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
      if (payload.iss === "vamojogar") {
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
        // name/email vêm de cookie auxiliar salvo no login/cadastro manual
        const userRaw = store.get("__session_user")?.value;
        const userInfo = userRaw ? JSON.parse(decodeURIComponent(userRaw)) : {};
        return {
          uid: payload.user_id,
          email: userInfo.email ?? null,
          name: userInfo.name,
          picture: userInfo.picture ?? undefined,
        };
      }
    }
  } catch { /* não é manual — continuar para Firebase */ }

  // 2. Token Firebase (fluxo Google existente)
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email ?? null, picture: decoded.picture, name: decoded.name };
  } catch {
    return null;
  }
}
```

**Cookie auxiliar `__session_user`:** JSON com `{ name, email }`, mesma vida do `__session` (7 dias), HttpOnly, SameSite=Lax. Criado pelas rotas de auth manual, removido no logout.

> **Importante:** `backend.ts` e `registrationFlow.ts` não precisam de alteração — eles apenas leem o cookie `__session` e o enviam como Bearer token, o que já funciona com tokens manuais.

---

### Etapa 2 — Criar `src/app/api/auth/manual/register/route.ts`

Rota proxy que recebe o form de cadastro, chama o backend e cria a sessão.

**Lógica:**
1. Recebe POST com `{ name, email, password }` (JSON).
2. Faz `POST ${BACKEND_URL}/api/v1/auth/register` com o body.
3. Se backend retornar erro, devolve JSON com mensagem tratada (ver tabela de erros).
4. Se sucesso, recebe `{ token, user: { name, email } }`.
5. Seta cookie `__session` com o token (mesmo formato: `encodeURIComponent(token)`, HttpOnly, SameSite=Lax, Max-Age=604800).
6. Seta cookie `__session_user` com `encodeURIComponent(JSON.stringify({ name, email }))`, mesmas flags.
7. Usuário novo vai **sempre** para `/cadastro` (nunca tem perfil completo ainda).
8. Retorna `{ ok: true, redirect: "/cadastro" }` — o cliente redireciona via `router.push`.

**Por que não redirecionar direto do route handler:** o cookie recém setado no Response ainda não está disponível para `cookies()` na mesma requisição, então `resolveRegistrationRoute()` não funcionaria aqui. O redirect simples para `/cadastro` é correto para novos cadastros.

---

### Etapa 3 — Criar `src/app/api/auth/manual/login/route.ts`

**Lógica:**
1. Recebe POST com `{ email, password }` (JSON).
2. Faz `POST ${BACKEND_URL}/api/v1/auth/login`.
3. Se erro, retorna JSON com mensagem tratada.
4. Se sucesso, recebe `{ token, user: { name, email } }`.
5. Seta `__session` e `__session_user` (idem ao register).
6. Determina destino: fazer as mesmas chamadas inline que o `callback/google` faz — chamar `${BACKEND_URL}/api/v1/users/me` e `${BACKEND_URL}/api/v1/marketingQuestions/survey-status` passando o token manualmente no header (não via `backendFetch`, pois o cookie ainda não está disponível nesta request).
7. Retorna `{ ok: true, redirect: "/dashboard" | "/cadastro" | "/cadastro?etapa=esportes" }`.

**Erros a tratar (retornar como `{ error: string }`):**

| HTTP backend | Código | Mensagem para o usuário |
|---|---|---|
| 404 | `not_found` | "Email não encontrado." |
| 401 | `unauthorized` | "Senha incorreta." |
| 400 | `email_login_not_available` | "Esta conta usa login pelo Google. Clique em 'Continuar com Google'." |
| 422 | `validation_error` | Repassar os erros de campo |
| 5xx | — | "Erro interno. Tente novamente." |

---

### Etapa 4 — Modificar `src/app/login/page.tsx`

A página já é `"use client"`. Adicionar:

**Estados necessários:**
```typescript
const [tab, setTab] = useState<"google" | "email">("google");
const [mode, setMode] = useState<"login" | "register">("login"); // só visível na tab "email"
const [loading, setLoading] = useState(false);
const [fieldError, setFieldError] = useState<string | null>(null);
```

**Layout:**
```
┌─────────────────────────────────────┐
│         vamojogar                   │
│                                     │
│  [  Google  ] [  Email e senha  ]   │  ← tabs
│                                     │
│  ── TAB GOOGLE ──                   │
│  [Continuar com Google]             │
│                                     │
│  ── TAB EMAIL ──                    │
│  [ Entrar ] [ Criar conta ]         │  ← sub-tabs login/register
│                                     │
│  TAB EMAIL + ENTRAR:                │
│  Email ___________________________  │
│  Senha ___________________________  │
│  [Entrar]                           │
│                                     │
│  TAB EMAIL + CRIAR CONTA:           │
│  Nome  ___________________________  │
│  Email ___________________________  │
│  Senha (mín. 8 chars) ____________  │
│  Confirmar senha __________________  │
│  [Criar conta]                      │
└─────────────────────────────────────┘
```

**Validações no cliente (antes de chamar a rota):**
- Cadastro: confirmação de senha igual; email formato básico; senha ≥ 8 chars; nome não vazio.
- Login: email e senha não vazios.

**Submit:**
```typescript
async function handleSubmit(e: FormEvent) {
  e.preventDefault();
  setLoading(true);
  setFieldError(null);
  const res = await fetch(
    mode === "register" ? "/api/auth/manual/register" : "/api/auth/manual/login",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) }
  );
  const data = await res.json();
  if (!res.ok) { setFieldError(data.error); setLoading(false); return; }
  router.push(data.redirect);
}
```

---

### Etapa 5 — Garantir limpeza de sessão no logout

Se já existe uma rota de logout (ex.: `DELETE /api/auth/session`), adicionar a limpeza do `__session_user`:
```typescript
response.headers.append("Set-Cookie", `__session_user=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
```

---

### Ordem de execução

```
1. session.ts     → sem isso, qualquer página protegida quebra com token manual
2. register/route → testar cadastro completo
3. login/route    → testar login + redirecionamento correto
4. login/page     → UI conectando tudo
5. logout         → garantir limpeza do __session_user
```

---

### Checklist de verificação end-to-end

- [ ] `POST /api/auth/manual/register` → redireciona para `/cadastro` → completa perfil → vai para `/dashboard`
- [ ] `POST /api/auth/manual/login` com perfil incompleto → `/cadastro`
- [ ] `POST /api/auth/manual/login` com perfil completo, survey pendente → `/cadastro?etapa=esportes`
- [ ] `POST /api/auth/manual/login` com perfil completo, survey feito → `/dashboard`
- [ ] Login manual + depois Google com mesmo email → vinculação automática (backend cuida, sem ação no frontend)
- [ ] Logout limpa `__session` e `__session_user`
- [ ] Token expirado → `getSession()` retorna null → redireciona para `/login`
