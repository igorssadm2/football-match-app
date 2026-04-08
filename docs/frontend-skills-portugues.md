# Frontend — Skills em Português (consumo da API + cleanup do registry)

## Contexto

O frontend tem dois caminhos para obter nomes de habilidades:

1. **`SPORTS_SKILL_REGISTRY`** em `src/types/sportPerformance.ts` — objeto estático local,
   já em português, mas **desacoplado do banco de dados**. Qualquer mudança no banco
   não reflete automaticamente na tela enquanto esse registry for usado.

2. **API `GET /api/skills/{sport}`** — busca do backend e retorna `name` da coluna
   `named_skill` (hoje em inglês). Após a migration do backend passar a retornar
   `display_name`, este caminho entregará português automaticamente.

`CadastroForm.tsx` já usa o caminho 2 (fetch da API) e renderiza `skill.name`.
O problema é que `skill.name` hoje vem em inglês do banco.

**Objetivo:** garantir que a tela consome exclusivamente os dados da API, e identificar
onde o registry estático interfere ou pode ser removido como fonte primária.

---

## Ordem de execução (Red → Green)

```
1. Escrever teste de rota Next.js      → RED
2. Escrever teste de componente        → RED
3. Backend entrega display_name        → GREEN automático (sem mudança de código no frontend)
4. Cleanup do SPORTS_SKILL_REGISTRY    → Refactor
```

> Os testes de frontend só ficarão GREEN após o backend estar implementado.
> Isso é esperado no ciclo TDD — os testes descrevem o contrato desejado.

---

## Etapa 1 — Teste da rota Next.js

**Arquivo novo:** `vamojogar-web/src/app/api/skills/[sport]/route.test.ts`

```typescript
import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock do backendFetch para não bater no servidor real
jest.mock('@/lib/backendFetch', () => ({
  backendFetch: jest.fn(),
}));
import { backendFetch } from '@/lib/backendFetch';

const mockBackendFetch = backendFetch as jest.Mock;

describe('GET /api/skills/[sport]', () => {
  afterEach(() => jest.clearAllMocks());

  it('repassa o parâmetro de esporte para o backend', async () => {
    mockBackendFetch.mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    const req = new NextRequest('http://localhost/api/skills/football');
    await GET(req, { params: Promise.resolve({ sport: 'football' }) });

    expect(mockBackendFetch).toHaveBeenCalledWith(
      expect.stringContaining('/skills/football'),
      expect.anything(),
    );
  });

  it('retorna habilidades com name em português quando o backend retorna display_name traduzido', async () => {
    const backendPayload = [
      { id: 'finishing', name: 'Finalização', description: 'Precisão do chute ao gol.', min_value: 1, max_value: 10 },
      { id: 'passing',   name: 'Passe',        description: 'Qualidade de distribuição.', min_value: 1, max_value: 10 },
    ];
    mockBackendFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(backendPayload), { status: 200 }),
    );

    const req = new NextRequest('http://localhost/api/skills/football');
    const res = await GET(req, { params: Promise.resolve({ sport: 'football' }) });
    const body = await res.json();

    expect(body[0].name).toBe('Finalização');
    expect(body[0].id).toBe('finishing');   // ID permanece chave técnica
  });

  it('retorna 200 com array vazio para esporte sem habilidades cadastradas', async () => {
    mockBackendFetch.mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    const req = new NextRequest('http://localhost/api/skills/desconhecido');
    const res = await GET(req, { params: Promise.resolve({ sport: 'desconhecido' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});
```

---

## Etapa 2 — Teste de componente

**Arquivo:** `vamojogar-web/src/app/cadastro/CadastroForm.test.tsx`
(criar ou adicionar ao arquivo existente)

```typescript
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import CadastroForm from './CadastroForm';

// Mock MSW: intercepta fetch para a rota de skills
const server = setupServer(
  rest.get('/api/skills/football', (_req, res, ctx) =>
    res(
      ctx.json([
        { id: 'finishing',    name: 'Finalização',    description: 'Precisão do chute ao gol.', min_value: 1, max_value: 10 },
        { id: 'passing',      name: 'Passe',           description: 'Qualidade de distribuição.', min_value: 1, max_value: 10 },
        { id: 'ball_control', name: 'Condução',        description: 'Controle da bola.', min_value: 1, max_value: 10 },
        { id: 'positioning',  name: 'Posicionamento',  description: 'Inteligência tática.', min_value: 1, max_value: 10 },
        { id: 'physicality',  name: 'Físico',          description: 'Físico.', min_value: 1, max_value: 10 },
      ]),
    ),
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('CadastroForm — step Esportes / habilidades', () => {
  it('exibe o nome da habilidade em português vindo da API', async () => {
    render(<CadastroForm />);

    // Navegar até o step de esportes (assumindo que step 1 já foi preenchido)
    // Ajustar conforme o fluxo real do componente
    fireEvent.change(screen.getByRole('combobox', { name: /esporte/i }), {
      target: { value: 'football' },
    });

    await waitFor(() => {
      expect(screen.getByText('Finalização')).toBeInTheDocument();
      expect(screen.getByText('Passe')).toBeInTheDocument();
    });

    // Garantir que a chave técnica em inglês NÃO aparece como label
    expect(screen.queryByText('finishing')).not.toBeInTheDocument();
    expect(screen.queryByText('passing')).not.toBeInTheDocument();
  });

  it('não usa SPORTS_SKILL_REGISTRY como fonte primária — labels vêm da API', async () => {
    // Se o mock da API retornar nomes diferentes do registry estático,
    // a tela deve mostrar o que veio da API.
    server.use(
      rest.get('/api/skills/football', (_req, res, ctx) =>
        res(ctx.json([
          { id: 'finishing', name: 'Nome Vindo Da API', description: '', min_value: 1, max_value: 10 },
        ])),
      ),
    );

    render(<CadastroForm />);
    fireEvent.change(screen.getByRole('combobox', { name: /esporte/i }), {
      target: { value: 'football' },
    });

    await waitFor(() => {
      expect(screen.getByText('Nome Vindo Da API')).toBeInTheDocument();
      // "Finalização" do registry local NÃO deve aparecer se a API retornar outro valor
      expect(screen.queryByText('Finalização')).not.toBeInTheDocument();
    });
  });
});
```

---

## Etapa 3 — Nenhuma mudança de código no componente

`CadastroForm.tsx` já:
- Faz `fetch('/api/skills/${sport}')` ao selecionar esporte
- Armazena em `skillDefs`
- Renderiza `skill.name` nos labels dos sliders

Assim que o backend retornar `display_name` em português, a tela exibirá automaticamente
os nomes traduzidos. **Nenhuma alteração em `CadastroForm.tsx` é necessária.**

---

## Etapa 4 — Cleanup do `SPORTS_SKILL_REGISTRY`

**Arquivo:** `vamojogar-web/src/types/sportPerformance.ts`

### O que manter

- O tipo `Sport` (`'basketball' | 'tennis' | 'football' | 'volleyball'`) — usado em todo
  o sistema como chave técnica. **Não alterar.**
- As funções utilitárias `ratingsToMap`, `getSkillsForSport`.
- As interfaces `SkillRating`, `SportPerformanceProfile`, `SportSessionRating`.
- As constantes `MIN_SKILL_RATING`, `MAX_SKILL_RATING`.

### O que fazer com `SPORTS_SKILL_REGISTRY`

Verificar cada uso no projeto:

```bash
grep -r "SPORTS_SKILL_REGISTRY\|getSkillsForSport" src --include="*.ts" --include="*.tsx"
```

Para cada uso encontrado, avaliar:

| Cenário | Ação |
|---|---|
| Componente usa registry como fallback quando API falha | Remover fallback — API deve ser a única fonte |
| Teste unitário usa registry para montar mocks | Manter — é uso legítimo offline |
| Tela de grupo/sessão usa registry para exibir nomes | Substituir por fetch da API ou manter registry apenas se não houver rota de API para aquele contexto |

### Após verificação

Se `getSkillsForSport` não tiver uso em produção (apenas testes), adicionar comentário:

```typescript
/**
 * @deprecated Use a rota GET /api/skills/{sport} para obter nomes atualizados do banco.
 * Mantido apenas para uso em testes unitários offline.
 */
export const SPORTS_SKILL_REGISTRY: Record<Sport, SportSkillDefinition[]> = { ... };
```

---

## Verificação final

```bash
npm test
npm run test:coverage
```

Os testes de componente e de rota devem passar após o backend estar implementado
e a migration aplicada.
