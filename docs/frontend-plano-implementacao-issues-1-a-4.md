# Plano de implementação frontend — Issues 1 a 4 (sorteio de times / pré-jogo)

Este documento descreve **o que o backend expõe** e **o que o frontend deve implementar na UI e integração HTTP**, cobrindo as issues do roadmap de sorteio v2:


| Issue | Tema                                                                   | GitHub (referência)                                         |
| ----- | ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| **1** | Jogadores por time (default da partida + override na tela de sorteio)  | [#29](https://github.com/valhalla-team/vamojogar/issues/29) |
| **2** | Mover jogador entre times após o sorteio                               | [#30](https://github.com/valhalla-team/vamojogar/issues/30) |
| **3** | Posição (GK/campo) em convidado + balanceamento de goleiros no sorteio | [#31](https://github.com/valhalla-team/vamojogar/issues/31) |
| **4** | Rascunho até “Confirmar times” + bloqueio de re-sortear após confirmar | [#32](https://github.com/valhalla-team/vamojogar/issues/32) |


**Contratos OpenAPI / Swagger:** não estão copiados aqui; podes colar o esqueleto gerado a partir do repositório do backend (`cmd/api/docs/`) no teu projeto de exemplo.

**Documentação complementar já existente no repo:**

- [frontend-team-draw-integration.md](./frontend-team-draw-integration.md) — sorteio, erros, WhatsApp, fluxos.
- [frontend-pregame-metrics-and-guests.md](./frontend-pregame-metrics-and-guests.md) — convidados, `skill_ratings`, `GET/POST` skills.
- [roadmap-sorteio-v2-issues.md](./roadmap-sorteio-v2-issues.md) — contexto de produto e dependências.

---

## Fase 0 — Alinhar com `main` antes do resto

**Contexto:** houve alterações integradas diretamente na branch `main` (por outro desenvolvedor). O frontend deve **tratar isso como pré-requisito**.

1. Atualizar a branch de trabalho com `main` (`git fetch origin`, `git merge origin/main` ou rebase, conforme convenção do time).
2. Resolver conflitos, correr testes e lint do app, e garantir que **build e fluxos críticos** continuam a funcionar.
3. Só depois disso implementar as mudanças descritas nas issues 1–4 abaixo.

*Sem esta fase, risco de duplicar trabalho ou quebrar integrações já alinhadas com `main`.*

---

## Visão geral das rotas HTTP relevantes (base `/api/v1`)

Todas abaixo usam **autenticação Bearer (Firebase)**, salvo indicação em contrário.

### Pré-jogo


| Método | Caminho                      | Notas                                                                                  |
| ------ | ---------------------------- | -------------------------------------------------------------------------------------- |
| `POST` | `/groups/{groupID}/pregames` | Criar pré-jogo — pode incluir `players_per_team` (opcional, int ≥ 2, ≤ `max_players`). |
| `GET`  | `/pregames/{pregameID}`      | Detalhe — inclui `players_per_team` e `suggested_players_per_team` (quando aplicável). |
| `PUT`  | `/pregames/{pregameID}`      | Atualizar — pode alterar `players_per_team`.                                           |
| `GET`  | `/groups/{groupID}/pregames` | Lista — itens com os mesmos campos de PPT/sugestão quando o handler os expõe.          |


### Convidados e métricas (base para Issue 3 + sorteio)


| Método | Caminho                        | Notas                                                                   |
| ------ | ------------------------------ | ----------------------------------------------------------------------- |
| `POST` | `/pregames/{pregameID}/guests` | Corpo pode incluir `preferred_position` (opcional). Ver secção Issue 3. |
| `GET`  | `/skills/football`             | Dimensões de skills para UI.                                            |
| `POST` | `/users/me/skills/football`    | Persistir notas do utilizador autenticado.                              |


### Sorteio de times


| Método  | Caminho                                         | Issues                                                                                              |
| ------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `POST`  | `/pregames/{pregameID}/team-draw`               | 1, 3, 4 — cria/substitui run **em rascunho**; ver corpo na secção Issue 1 e 3.                      |
| `GET`   | `/pregames/{pregameID}/team-draw`               | 1–4 — estado atual; `is_confirmed`, `confirmed_at`, `players_per_team`, `balance_goalkeepers`, etc. |
| `POST`  | `/pregames/{pregameID}/team-draw/confirm`       | 4 — body vazio; fixa o sorteio atual.                                                               |
| `PATCH` | `/pregames/{pregameID}/team-draw/assignments`   | 2 — mover participante entre times.                                                                 |
| `GET`   | `/pregames/{pregameID}/team-draw/whatsapp-text` | Texto formatado dos **times sorteados**.                                                            |


---

## Issue 1 — Jogadores por time (PPT) e sugestão da partida

### Backend — comportamento

- `**players_per_team` no pré-jogo** (`GET`/`POST`/`PUT`): inteiro opcional persistido; validação típica: mínimo **2**, não superior a `max_players` na criação/atualização.
- `**suggested_players_per_team`** (`GET` pré-jogo e listagem por grupo): **somente leitura**, derivado (ex.: parse de `team_format` tipo `5x5` → primeiro número). Se não houver padrão reconhecido, pode omitir-se ou vir vazio — o UI não deve assumir sempre presente.
- `**POST /team-draw`**:
  - `**players_per_team` opcional** no body.
  - Se **presente**: o servidor calcula `num_teams = ceil(confirmados / PPT)` e **ignora** o `num_teams` enviado; último time pode ter menos jogadores.
  - Se **ausente**: fluxo legado com `**num_teams`** obrigatório (≥ 2, limites conforme regras de domínio).
- Resposta `201` inclui `num_teams`, `players_per_team` (quando aplicável ao run), `seed_used`, `balance_by_overall`, `balance_goalkeepers`, `is_confirmed`, `teams`, etc.

### Frontend — o que implementar (UI/UX)

1. **Ecrã de criação/edição da partida:** campo opcional “jogadores por time” alinhado com `players_per_team`; validação client-side coerente com limites.
2. **Ecrã de sorteio:**
  - Pré-preencher o controlo de PPT com `suggested_players_per_team` ou `players_per_team` do `GET` pré-jogo (prioridade de produto: persistido > sugerido).
  - Permitir **ou** definir `players_per_team` no `POST /team-draw` **ou** usar só `num_teams` (sem PPT), conforme regra acima.
3. **Feedback de erro:** tratar códigos e mensagens documentados em [frontend-team-draw-integration.md](./frontend-team-draw-integration.md) (`team_draw_players_per_team_too_large`, `team_draw_num_teams_out_of_range`, etc.).

---

## Issue 2 — Mover jogador entre times

### Backend

- `**PATCH /pregames/{pregameID}/team-draw/assignments`**
  - Body JSON:
    - `participant_id` — UUID do participante do pré-jogo (`pregame_participants.id`), o mesmo usado no sorteio.
    - `target_team_id` — UUID do time devolvido no `GET`/`POST` (`teams[].id`).
  - Resposta `**200**` com o **mesmo formato** que `GET /team-draw` (sorteio atual após a mudança).
  - Permissões: **criador do pré-jogo** ou **admin do grupo** (igual ao sorteio).
  - Erros de negócio com `code` em 400 (ex.: participante não está no draw, time inválido, **time destino cheio** respeitando `players_per_team` do run).

### Comportamento com Issue 4

- **Mover continua permitido após confirmar** o sorteio (ajuste fino dos times “oficiais”). O bloqueio de **re-sortear** aplica-se ao `POST /team-draw`, não ao `PATCH` de assignments.

### Frontend — o que implementar

1. Ação por jogador (ex.: menu ou botão “Mover para…” / modal com lista de times).
2. Após sucesso, atualizar estado com o JSON de resposta ou refazer `GET /team-draw`.
3. Tratar erros específicos (time cheio, IDs inválidos) com mensagens claras.

---

## Issue 3 — Posição (convidado) + `balance_goalkeepers`

### Parte A — Convidado manual

- `**POST /pregames/{pregameID}/guests`** aceita `**preferred_position**` (string opcional).
- Para o algoritmo de **goleiro**, o backend trata como goleiro quando a posição é `**goalkeeper`** (comparação case-insensitive). Outros valores (ex.: `striker`, `midfielder`, `defender` alinhados ao perfil de utilizador) são “linha”.
- Convém alinhar a UI com os valores já usados no perfil de futebol do utilizador (`preferred_position` no ecossistema user), sendo `**goalkeeper**` o valor crítico para o sorteio de GK.

### Parte B — Sorteio

- `**POST /team-draw**` aceita `**balance_goalkeepers**` (boolean opcional). Se omitido, o default é definido pelo backend (tipicamente `false`); a resposta `**balance_goalkeepers**` reflete o valor efetivo do run.
- Quando `true`, o domínio aplica lógica extra para distribuir goleiros entre times (documentação de comportamento fino: testes em `domain/pregame/teamdraw` e handlers).

### Métricas e skills (obrigatório para sorteio)

- Convidados **não** podem ser criados só com `guest_name`; é necessário `**display_name` + `skill_ratings` completos** (ou `manual_profile_id` com perfil já completo). Ver [frontend-pregame-metrics-and-guests.md](./frontend-pregame-metrics-and-guests.md).
- Utilizadores com conta: `**POST /users/me/skills/football`** após questionário; `**GET /skills/football**` para labels.

### Frontend — o que implementar

1. **Formulário de convidado:** selector ou chips para `preferred_position` (no mínimo distinguir **goleiro** vs **linha** para o utilizador entender impacto no sorteio).
2. **Ecrã de sorteio:** toggle ou opção **“Balancear goleiros”** ligada a `balance_goalkeepers` no `POST /team-draw`; mostrar na UI o valor devolvido (`GET` mostra o run atual).
3. Garantir que **422** no sorteio mostra `errors.general` e opcionalmente destaca `errors.participant_ids` (IDs são de `**pregame_participants`**).

---

## Issue 4 — Rascunho vs times confirmados

### Backend — modelo mental

- Cada execução de sorteio gera/atualiza um **run** no servidor.
- Enquanto `**is_confirmed === false`**: o run é **rascunho**; o organizador pode **voltar a sortear** com `POST /team-draw` (substitui o run atual não confirmado).
- Quando `**is_confirmed === true`**: os times estão **fixos** para aquele run; `**POST /team-draw`** devolve `**409 Conflict**` (não é permitido re-sortear no estado atual).
- `**POST /pregames/{pregameID}/team-draw/confirm**`
  - Body vazio.
  - `**200**`: inclui `is_confirmed: true`, `confirmed_at` (timestamp), identificadores do run/pré-jogo conforme contrato da aplicação.
  - `**409**` se já estava confirmado.
  - `**404**` se não existe sorteio atual para confirmar.
  - Permissões: iguais à criação do sorteio.

### Campos em `GET`/`POST`/`PATCH` do sorteio

- `**is_confirmed**` (boolean)
- `**confirmed_at**` (opcional, ISO 8601) — preenchido quando confirmado

### Frontend — o que implementar

1. **Estados visuais claros:**
  - **Rascunho:** badge ou texto “Rascunho” / “Ainda não confirmado”; botão **Re-sortear** visível para quem tem permissão.
  - **Confirmado:** badge “Times confirmados” + data (`confirmed_at`) se útil ao utilizador.
2. **Botão “Confirmar times”** chama `POST .../team-draw/confirm`; após sucesso, atualizar estado local com `is_confirmed` e `confirmed_at`.
3. **Re-sortear:** só disponível com `is_confirmed === false`. Se o utilizador tentar após confirmar, o backend responde **409** — mostrar mensagem explícita (não há fluxo de “desconfirmar” neste contrato).
4. **Reabrir a partida / voltar ao ecrã:** ao carregar, `GET /team-draw`:
  - `**404`:** ainda não houve sorteio (fluxo “Sortear”).
  - `**200`:** mostrar times; ler `is_confirmed` para decidir CTA (confirmar vs re-sortear vs só visualizar).

---

## Checklist consolidado por ecrã (sugestão)


| Área                           | Itens                                                                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Partida (CRUD)**             | `players_per_team` opcional; exibir/editar com validação.                                                            |
| **Lista de partidas do grupo** | Consumir `suggested_players_per_team` / `players_per_team` se necessário para badges ou resumo.                      |
| **Convidados**                 | `display_name` + skills completas; `preferred_position`; sem `guest_name` isolado.                                   |
| **Skills utilizador**          | `GET /skills/football`, `POST /users/me/skills/football` após onboarding de notas.                                   |
| **Sorteio**                    | PPT ou `num_teams`; `balance_by_overall`; `balance_goalkeepers`; `force_below_min` + modal; **201** no POST.         |
| **Pós-sorteio**                | Mover jogador (`PATCH` assignments); copiar WhatsApp (`GET .../team-draw/whatsapp-text`).                            |
| **Ciclo de vida**              | `is_confirmed` / `confirmed_at`; botão confirmar; esconder/ desativar re-sortear quando confirmado; **409** tratado. |


---

## Ordem sugerida de implementação no frontend

1. Fase 0 — merge de `main` e estabilização.
2. Métricas/convidados/skills (necessário para sorteio válido) — ver doc dedicado.
3. Issue 1 — PPT + formulário de sorteio + erros.
4. Issue 4 — estados rascunho/confirmado + endpoint de confirmar + **409** no redraw.
5. Issue 2 — mover jogador (pode ser paralelo à 4 na UI).
6. Issue 3 — `preferred_position` em convidados + toggle `balance_goalkeepers`.

Esta ordem reflete dependências de produto: sem dados de jogadores o sorteio falha; sem draft/confirmar a UX de “oficial vs provisório” fica incompleta.

---

*Documento focado em integração e UI; detalhes de tipos exatos estão no código gerado (Swagger) e nos handlers em `application/pregame/`.*