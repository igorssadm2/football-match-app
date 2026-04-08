# Integração Frontend: Sorteio de Times (Snake + Métricas)

Este documento resume o que já foi implementado no backend para a feature de sorteio de times, e o que o frontend precisa consumir.

**Ver também:** [Métricas, convidados e skills](./frontend-pregame-metrics-and-guests.md) (alterações obrigatórias em `POST /guests`, endpoint de skills e alinhamento com o sorteio).

## Objetivo da feature

- Sortear times equilibrados usando snake distribution com base nas métricas dos jogadores.
- Considerar apenas participantes com status `confirmed`.
- Permitir sortear abaixo do mínimo de confirmados mediante confirmação explícita.
- Exportar texto pronto para WhatsApp com os times sorteados.

## Escopo v1 já implementado

- Esporte suportado: `football` (futebol) somente.
- Times nomeados automaticamente: `Time A`, `Time B`, `Time C`, ...
- Histórico interno de sorteios para reduzir repetição em re-sorteios.
- Métricas obrigatórias para todos os participantes sorteáveis (usuário real e manual).
- Waiting list **não entra** no sorteio.

## Algoritmo snake e re-sorteio

- Cada execução usa um **seed** novo (timestamp + tentativas internas). O mesmo seed com os mesmos jogadores produz o **mesmo** resultado.
- **`balance_by_overall`** no body do `POST /team-draw` (opcional, default **`true`**): quando `true`, antes do snake a ordem usa **overall + jitter** como hoje. Quando `false`, a ordem é um **embaralhamento determinístico** pelo seed (sem usar overall na ordenação); o padrão snake em si é o mesmo. O histórico de “não repetir assinatura” considera só sorteios do **mesmo modo** (balanceado vs aleatório). O `GET` do sorteio atual devolve `balance_by_overall` conforme o run gravado (`algo_version` interno: `snake_v1` vs `snake_random_v1`).
- Com `balance_by_overall: true`, a ordem dos jogadores usa um **score de ordenação** = `overall + jitter`, com jitter uniforme derivado do seed (largura total **0,6** no domínio — `OrderJitterWidth` em `domain/pregame/teamdraw`). Assim, **re-sortear** tende a **mudar a composição dos times** mesmo com overalls fixos; o trade-off é um balanceamento um pouco menos “engessado” do que ordenar só por overall puro.
- O backend ainda tenta **não repetir** a mesma **assinatura** de times dos **últimos 5** sorteios daquele pré-jogo **no mesmo modo**, **mesmo `num_teams`** e **mesmo `players_per_team` gravado no run** (legado sem PPT compara com run também sem PPT).
- **POST** `/team-draw` responde **201 Created** com o JSON completo; o front deve tratar **201** e atualizar a UI (ver checklist).

### Rascunho vs times confirmados (Issue 4)

- O sorteio atual persiste no servidor como **rascunho** até o organizador **confirmar**.
- **`is_confirmed`** e **`confirmed_at`** (opcional, ISO 8601) vêm no JSON do **POST** `/team-draw`, **GET** `/team-draw` e na resposta do **PATCH** assignments — espelham o run atual.
- Enquanto **`is_confirmed` = false**, o organizador pode **re-sortear** com **POST** `/team-draw` (substitui o run atual).
- Depois de **`is_confirmed` = true`**, um **POST** `/team-draw` sozinho retorna **409 Conflict** — é preciso **remover o run atual** com **DELETE** antes de criar outro.
- **Re-sortear do zero após confirmar (organizador):** **DELETE** `/api/v1/pregames/{pregameID}/team-draw` → **204 No Content** quando permitido (criador do pré-jogo ou admin do grupo, pré-jogo **open**). Remove o run (confirmado ou não); CASCADE apaga times e atribuições. O front em seguida abre a tela de configuração e faz **POST** `/team-draw` como no fluxo normal.
- **Confirmar** o sorteio atual: **POST** `/api/v1/pregames/{pregameID}/team-draw/confirm` (body vazio), resposta **200** com `is_confirmed: true` e `confirmed_at` preenchido. Permissões iguais ao sorteio.
- **Mover jogador** (PATCH assignments) continua permitido após confirmar (ajuste fino de times oficiais), até alguém descartar o run com DELETE.

## Endpoints disponíveis

### 1) Criar sorteio

- **POST** `/api/v1/pregames/{pregameID}/team-draw`
- Body:

```json
{
  "num_teams": 2,
  "players_per_team": 5,
  "force_below_min": false,
  "balance_by_overall": true
}
```

- `players_per_team` é **opcional**. Se **omitido**, o fluxo é o legado: usar só `num_teams` (>= 2 e <= confirmados).
- Se **`players_per_team` estiver presente**, o servidor calcula `num_teams = ceil(confirmados / players_per_team)` (último time pode ter menos jogadores) e **ignora** o `num_teams` enviado no body.
- `balance_by_overall` pode ser omitido; omitir = `true`. Use `false` para sorteio aleatório na ordem antes do snake.

- Resposta `201` (exemplo):

```json
{
  "draw_run_id": "uuid",
  "pregame_id": "uuid",
  "num_teams": 2,
  "players_per_team": 5,
  "seed_used": 1743692952000000000,
  "balance_by_overall": true,
  "balance_goalkeepers": false,
  "is_confirmed": false,
  "teams": [
    {
      "id": "uuid",
      "name": "Time A",
      "players": [
        {
          "participant_id": "uuid",
          "name": "João",
          "overall": 7.5
        }
      ]
    }
  ]
}
```

### 2) Buscar sorteio atual

- **GET** `/api/v1/pregames/{pregameID}/team-draw`
- Resposta `200`: mesmo formato de times/jogadores da criação, incluindo `balance_by_overall`, `balance_goalkeepers`, `is_confirmed`, `confirmed_at` (quando confirmado) e `players_per_team` quando o run foi criado com PPT.

### 2b) Confirmar times (fixar o sorteio atual)

- **POST** `/api/v1/pregames/{pregameID}/team-draw/confirm`
- Body vazio; resposta **200** com `draw_run_id`, `pregame_id`, `confirmed_at`, `is_confirmed: true`.
- **409** se já estava confirmado.

### 2c) Descartar sorteio atual (rascunho ou confirmado)

- **DELETE** `/api/v1/pregames/{pregameID}/team-draw`
- Resposta **204 No Content** em sucesso (remove o run atual; times e atribuições em CASCADE).
- Mesmas permissões de sorteio: criador do pré-jogo ou admin do grupo; pré-jogo deve estar **open**.
- Depois do **204**, o front pode navegar para a tela de configuração e chamar **POST** `/team-draw` (evita **409** de “já existe sorteio confirmado”).

### 3) Mover jogador entre times (edição manual)

- **PATCH** `/api/v1/pregames/{pregameID}/team-draw/assignments`
- Body:

```json
{
  "participant_id": "uuid-do-pregame-participant",
  "target_team_id": "uuid-de-um-time-do-GET-team-draw"
}
```

- Resposta **200**: mesmo JSON que o **GET** `/team-draw` (sorteio atual após a mudança).
- Permissões: **criador do pré-jogo** ou **admin do grupo** (igual ao POST do sorteio).
- Erros de negócio (`400` + `code`): `team_draw_move_participant_not_in_draw`, `team_draw_move_target_team_invalid`, `team_draw_move_destination_team_full`, entre outros no Swagger.


### 4) Texto para WhatsApp dos times

- **GET** `/api/v1/pregames/{pregameID}/team-draw/whatsapp-text`
- Resposta `200`:

```json
{
  "text": "*Times sorteados*\n\n*Time A:*\n1. João\n2. Carlos\n\n*Time B:*\n1. Pedro\n2. Lucas"
}
```

## Regras de negócio que impactam a UI

- Somente criador do pré-jogo ou admin do grupo pode sortear ou **mover jogador entre times** (PATCH de assignments).
- Sorteio só ocorre com pré-jogo `open`.
- Sem `players_per_team`: `num_teams` deve ser >= 2 e <= quantidade de confirmados.
- Com `players_per_team`: o servidor valida PPT e deriva `num_teams`; ver erros abaixo.
- Se confirmados < mínimo do pré-jogo:
  - backend retorna erro específico pedindo confirmação;
  - frontend deve exibir modal de confirmação;
  - ao confirmar, reenviar `POST` com `force_below_min: true`.

## Mapeamento de erros para tratamento no frontend

### POST `/team-draw`

- `400` + `code=team_draw_min_confirmed_not_reached`
  - Exibir modal: “Quantidade mínima não atingida. Deseja continuar?”
- `400` + `code=team_draw_num_teams_out_of_range`
  - Exibir validação de formulário para quantidade de times (ou ajustar PPT/confirmados se o cálculo automático ficou inválido).
- `400` + `code=team_draw_players_per_team_too_large`
  - PPT maior que a quantidade de confirmados; reduzir PPT ou aguardar mais confirmações.
- `400` + `code=team_draw_no_confirmed_participants`
  - Exibir estado vazio: “Sem confirmados para sortear.”
- `400` + `code=team_draw_pregame_not_open`
  - Exibir mensagem contextual de estado do pré-jogo.
- `400` + `code=team_draw_sport_not_supported`
  - Exibir aviso de escopo (v1 apenas futebol).
- `403`
  - Exibir “Você não tem permissão para sortear.”
- `404`
  - Exibir “Pré-jogo não encontrado.”
- `422` (`ValidationError` — campo `errors` no JSON)
  - **`errors.general`**: mensagem única em português explicando o problema (ler e exibir em destaque).
  - **`errors.participant_ids`**: lista de UUIDs dos participantes do pré-jogo afetados (útil para destacar cards na lista).
  - Campo `players_per_team`: mínimo 2 quando enviado.
  - Causa típica (métricas): dados legados (convidado sem perfil manual completo), perfil manual incompleto ao reusar `manual_profile_id`, ou usuário do app **sem** `user_sport_profiles` de futebol utilizável (`skill_ratings` e/ou `skill_level`). Novos convidados pela API exigem métricas completas — ver [frontend-pregame-metrics-and-guests.md](./frontend-pregame-metrics-and-guests.md).
- `500`
  - Exibir erro genérico com opção de tentar novamente.

### DELETE `/team-draw`

- **204**: sucesso; não há body.
- **403** / **404** / **409** (pré-jogo não aberto, sem permissão, etc.): exibir mensagem do JSON; não assumir que sorteio confirmado bloqueia DELETE se o backend estiver atualizado.

### GET `/team-draw` e `/team-draw/whatsapp-text`

- `404` (sem sorteio atual): tratar como estado “ainda não sorteado”.

## Pré-jogo: default e sugestão de PPT

- `GET`/`POST`/`PUT` de pré-jogo expõem `players_per_team` (persistido, opcional).
- `GET` (e listagem por grupo) pode incluir `suggested_players_per_team` derivado de `team_format` quando o texto bater no padrão tipo `5x5` (primeiro número); senão o campo não vem ou é omitido.

## Fluxo sugerido de tela

1. Carregar tela de sorteio.
2. Chamar `GET /team-draw`.
3. Se `404`, mostrar CTA “Sortear times”.
4. Usuário escolhe quantidade de times (`num_teams`) **ou** jogadores por time (`players_per_team`), e confirma.
5. Chamar `POST /team-draw`.
6. Se erro de mínimo não atingido, abrir modal de confirmação.
7. Se usuário confirmar, reenviar `POST` com `force_below_min=true`.
8. Renderizar times retornados.
9. Botão “Copiar para WhatsApp” chama `GET /team-draw/whatsapp-text` e copia `text`.

## Checklist de integração frontend

- Tela com seletor de `num_teams` e/ou `players_per_team` (alinhar com `players_per_team` e `suggested_players_per_team` do pré-jogo).
- Modal de confirmação para mínimo não atingido.
- Tratamento explícito de `404` como “sem sorteio atual”.
- Tratamento explícito de `403` (permissão).
- Re-sortear com **rascunho** (`is_confirmed: false`): **POST** `/team-draw` — aceitar **HTTP 201** como sucesso e **atualizar estado** com o body ou `GET /team-draw`.
- Re-sortear após **confirmar**: fluxo **DELETE** `/team-draw` (esperar **204**) → tela de config → **POST** `/team-draw` (o POST sozinho continua podendo retornar **409** enquanto existir run confirmado).
- Botão de copiar texto para WhatsApp.

## Observação importante

- O backend mantém histórico interno para reduzir repetição de times em re-sorteio, mas esse histórico não é exposto na UI v1.
