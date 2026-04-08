# Auditoria: remoção do sorteio de times legado (draft API)

**Escopo:** repositório **vamojogar-web** (Next.js). App **mobile** não está neste repo — repetir a mesma busca lá (`draft`, `/draft`, `sorteio`, etc.).

**Data:** 2026-04-01

## 1. Endpoints removidos no backend

| Método | Rota (legado) |
|--------|----------------|
| `POST` | `/api/v1/pregames/{pregameID}/draft` |
| `GET` | `/api/v1/pregames/{pregameID}/draft` |
| `PATCH` | `/api/v1/pregames/{pregameID}/draft/players/{participantID}/move` |

## 2. O que foi procurado no web

- Chamadas `fetch` / proxies em `src/app/api/**` para `.../draft` ou `draft/players`.
- Strings: `draft`, `sorteio`, `DraftTeams`, `GetDraft`, `MoveDraftPlayer`, paths terminando em `/draft` (exceto dependências npm `@open-draft/*`).

## 3. Resultado da auditoria (web)

| Área | Resultado |
|------|-----------|
| **Proxies Next.js** (`src/app/api/pregames/...`) | Não existe rota `draft`; apenas `guests`, `join`, `participants`, `invitations`, `whatsapp-text`, etc. |
| **Páginas / componentes** | Nenhuma UI “sortear times”, “sorteio” ou integração com os endpoints acima. |
| **`src/types/pregame.ts` — `PreGameStatus`** | Inclui o literal `"draft"`, referente ao **estado do pré-jogo** (rascunho/publicação), **não** ao sorteio de times. **Manter** enquanto o backend continuar a expor esse status. |
| **`swagger.json`** | Ficheiro **ignorado pelo Git** (`.gitignore`). Deve ser copiado do backend na release alinhada ao deploy; não deve listar as rotas de draft. |
| **`src/types/api-v1.d.ts`** | Gerado com `npm run generate:api-types` a partir do `swagger.json` local; **atualizado** nesta entrega para remover paths e schemas do draft legado. |

## 4. Ações feitas nesta entrega

- Regenerado `src/types/api-v1.d.ts` com `openapi-typescript` para refletir API **sem** draft.
- Build (`npm run build`) e testes (`npm test`) executados com sucesso.

## 5. Critérios de aceite (checklist)

- [x] Nenhuma chamada de runtime no `src/` aos três endpoints de draft legado.
- [x] Tipos OpenAPI (`api-v1.d.ts`) sem rotas `/pregames/.../draft`.
- [x] Fluxos principais de pré-jogo (participantes, convidados, convites, WhatsApp) não dependem de draft.
- [x] Build e testes passando.

## 6. Manutenção futura

Quando o backend publicar novo sorteio (baseado em métricas):

1. Atualizar `swagger.json` a partir de `cmd/api/docs/swagger.json` do backend.
2. Rodar `npm run generate:api-types`.
3. Implementar UI e proxies conforme as novas rotas.
