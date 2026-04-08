# Frontend: métricas, convidados e alinhamento com o sorteio

Este documento descreve **alterações recentes no backend** que o frontend precisa refletir: convidados manuais com métricas obrigatórias, persistência de skills para usuários logados e tratamento de erros do sorteio.

Documento relacionado: [Integração do sorteio de times](./frontend-team-draw-integration.md).

---

## Resumo das mudanças (backend)

| Área | O que mudou |
|------|-------------|
| **POST `/pregames/{id}/guests`** | Fluxo só com `guest_name` **não é mais suportado**. É obrigatório criar convidado com **`display_name` + `skill_ratings` completos** ou reutilizar **`manual_profile_id`** com perfil que já tenha todas as dimensões salvas. |
| **Validação de `skill_ratings`** | Para futebol, o backend exige **todas** as habilidades do registro (IDs abaixo), notas **1–10**. Mapa vazio ou incompleto → **422**. |
| **Reuso de perfil manual** | Body pode omitir `skill_ratings` se o perfil no banco já tiver ratings completos; caso contrário, enviar `skill_ratings` (merge com o armazenado; resultado final deve estar completo). |
| **Usuário com conta** | Cadastro de esporte **não** grava `skill_ratings` em `attributes`. As notas 1–10 devem ser persistidas com **POST `/users/me/skills/football`**. |
| **Sorteio** | Continua exigindo dados utilizáveis por participante confirmado. Há **fallback** por `skill_level` (casual / competitive / professional) na linha de `user_sport_profiles` quando **não** existir `skill_ratings`; o ideal para balanceamento é ter notas salvas via skills. |
| **Erro 422 do sorteio** | Resposta inclui **`errors.general`** (texto longo em PT-BR) e **`errors.participant_ids`** (UUIDs de `pregame_participants.id`, não `user_id`). |

---

## 1. Convidados — `POST /api/v1/pregames/{pregameID}/guests`

Autenticação: **Bearer** (Firebase).

### 1.1 Criar novo convidado (perfil manual novo)

Body (exemplo mínimo conceitual):

```json
{
  "display_name": "Nome do convidado",
  "skill_ratings": {
    "finishing": 5,
    "passing": 5,
    "ball_control": 5,
    "positioning": 5,
    "physicality": 5
  }
}
```

**IDs obrigatórios para futebol** (devem bater com `GET /api/v1/skills/football`):

| `skill_id` | Uso |
|------------|-----|
| `finishing` | Finalização |
| `passing` | Passe |
| `ball_control` | Condução |
| `positioning` | Posicionamento |
| `physicality` | Físico |

Regras:

- `display_name` obrigatório neste fluxo.
- **Não** enviar só `guest_name` (rejeitado na validação).
- `skill_ratings`: objeto com **exatamente** essas chaves (para o esporte do grupo), valores inteiros **1–10**.

### 1.2 Reutilizar perfil manual existente (mesmo grupo)

```json
{
  "manual_profile_id": "uuid-do-perfil-manual"
}
```

- Opcionalmente incluir `skill_ratings` para **atualizar** ou **completar** o que está salvo no perfil.
- Não combinar `manual_profile_id` com `guest_name` ou `display_name`.

### 1.3 Resposta de sucesso (`201`)

Campos úteis: `participant_id`, `pregame_id`, `guest_name`, `manual_profile_id`, `status`, `joined_at`.

### 1.4 Erros comuns

- **422** — `errors` com chaves como `display_name`, `guest_name`, `skill_ratings`, `pregame_id`, etc.
- **403** — quem chama não é criador do pré-jogo nem admin do grupo.
- **409** — perfil manual já vinculado a este pré-jogo.

---

## 2. Definição de skills e persistência (usuário logado)

### 2.1 Listar dimensões (labels, limites)

- **GET** `/api/v1/skills/football`
- Resposta: array de objetos com `id`, `name`, `description`, `min_value`, `max_value` (cache no servidor ~5 min).

Use isso para montar o formulário de notas e para validar o mesmo conjunto de IDs que o backend exige nos convidados.

### 2.2 Salvar notas do usuário autenticado

- **POST** `/api/v1/users/me/skills/football`
- Body: mapa JSON `skill_id → nota` (1–10), mesmas chaves de futebol.
- Exemplo:

```json
{
  "finishing": 7,
  "passing": 6,
  "ball_control": 8,
  "positioning": 7,
  "physicality": 6
}
```

Resposta `200`: `{ "ok": true }` (conforme OpenAPI).

**Quando chamar:** após o usuário concluir o fluxo de avaliação de habilidades no app, para que o sorteio e outras features leiam `user_sport_profiles.attributes.skill_ratings`.

---

## 3. Sorteio de times (referência rápida)

Detalhes completos: [frontend-team-draw-integration.md](./frontend-team-draw-integration.md).

- **POST** `/api/v1/pregames/{pregameID}/team-draw`
- Em **422**, ler:
  - `errors.general[0]` (ou concatenar se vier lista) para mensagem ao usuário;
  - `errors.participant_ids` para destacar na lista de participantes (IDs são de **`pregame_participants`**).

Atualização em relação à causa do erro:

- Convidados criados pela API atual **não** entram mais sem métricas completas; se ainda aparecer 422, pode ser dado legado no banco, usuário sem perfil de futebol utilizável, ou perfil manual antigo incompleto ao reusar `manual_profile_id`.

---

## 4. Checklist de implementação no frontend

- [ ] Remover ou migrar qualquer chamada a `POST .../guests` que use **apenas** `guest_name`.
- [ ] Formulário de convidado: `display_name` + todas as notas 1–10; validar localmente antes do POST.
- [ ] Carregar labels/ids de **GET `/api/v1/skills/football`** (ou constantes alinhadas a esses ids).
- [ ] Fluxo de reuso de jogador manual: suportar `manual_profile_id` com ou sem `skill_ratings` conforme regras acima.
- [ ] Após questionário de habilidades do usuário logado: **POST `/api/v1/users/me/skills/football`**.
- [ ] Tela de sorteio: tratar **422** com `errors.general` e opcionalmente `errors.participant_ids`.
- [ ] Manter integração já descrita no doc do sorteio (modal `force_below_min`, GET sorteio, WhatsApp, etc.).

---

## 5. Prompt para execução no frontend (copiar e colar)

Use o bloco abaixo em uma tarefa para o time ou em um assistente de código (Cursor, etc.):

```text
Você está integrando o app ao backend VamoJogar (pré-jogo / futebol).

Leia e implemente com base no repositório/documentação interna:
- doc/frontend-pregame-metrics-and-guests.md (métricas, convidados, skills)
- doc/frontend-team-draw-integration.md (sorteio, WhatsApp, erros 400)

Tarefas obrigatórias:

1) POST /api/v1/pregames/{pregameID}/guests
   - Eliminar o uso de body só com guest_name.
   - Novo convidado: sempre display_name + skill_ratings com TODAS as chaves de futebol: finishing, passing, ball_control, positioning, physicality (valores int 1–10).
   - Reuso: manual_profile_id; skill_ratings opcional se o perfil já estiver completo no backend, senão enviar merge/completar.
   - Tratar 422 (errors.display_name, errors.guest_name, errors.skill_ratings, etc.).

2) GET /api/v1/skills/football
   - Usar para montar UI de notas (ids e labels) e manter consistência com o backend.

3) POST /api/v1/users/me/skills/football
   - Após o usuário preencher o questionário de habilidades, persistir o mapa skill_id → nota (1–10) para todas as dimensões necessárias.

4) POST /api/v1/pregames/{pregameID}/team-draw
   - Em 422 ValidationError: exibir errors.general ao usuário; opcionalmente destacar participantes cujos ids aparecem em errors.participant_ids (são pregame_participants.id, não user_id).
   - Manter fluxo existente de force_below_min e demais códigos 400 descritos no doc do sorteio.

Entregáveis: código atualizado, sem chamadas legadas a guests só com guest_name; validação client-side alinhada; mensagens de erro legíveis para 422 do sorteio e dos guests.
```

---

## Changelog (backend — referência)

- Validação estrita de `skill_ratings` completo em `add_guest`.
- Validador HTTP rejeita `guest_name` isolado; exige `display_name` no fluxo de criação.
- Sorteio: mensagens 422 mais ricas; leitura de métricas com fallback por `skill_level` em `user_sport_profiles` quando `skill_ratings` ausente (usuários com conta).
