export type Sport = 'basketball' | 'tennis' | 'football' | 'volleyball';

export interface SportSkillDefinition {
  id: string;
  name: string;
  description: string;
}

/** Nota de um usuário em uma habilidade (1–10). */
export interface SkillRating {
  skillId: string;
  rating: number; // 1–10
  updatedAt: string; // ISO 8601
}

/** Perfil de desempenho de um usuário em um esporte. */
export interface SportPerformanceProfile {
  id: string;
  userId: string;
  sport: Sport;
  ratings: SkillRating[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Registry de habilidades por esporte — fonte de verdade para formulários e UI
// ---------------------------------------------------------------------------

export const SPORTS_SKILL_REGISTRY: Record<Sport, SportSkillDefinition[]> = {
  basketball: [
    { id: 'shooting',    name: 'Arremesso',      description: 'Precisão de média e longa distância.' },
    { id: 'dribbling',   name: 'Drible',          description: 'Controle de bola sob pressão.' },
    { id: 'game_vision', name: 'Visão de Jogo',   description: 'Capacidade de ler a defesa e dar assistências.' },
    { id: 'athleticism', name: 'Impulsão',         description: 'Eficiência em rebotes e enterradas.' },
    { id: 'defense',     name: 'Defesa',           description: 'Capacidade de bloqueio e roubo de bola.' },
  ],
  tennis: [
    { id: 'serve',        name: 'Saque',              description: 'Potência e precisão no serviço inicial.' },
    { id: 'groundstrokes',name: 'Forehand/Backhand',   description: 'Técnica e força nos golpes de fundo.' },
    { id: 'agility',      name: 'Agilidade',           description: 'Velocidade de reação e deslocamento lateral.' },
    { id: 'volley',       name: 'Voleio',              description: 'Precisão e reflexo junto à rede.' },
    { id: 'endurance',    name: 'Resistência',         description: 'Manutenção do nível técnico em sets longos.' },
  ],
  football: [
    { id: 'finishing',    name: 'Finalização',     description: 'Precisão do chute ao gol.' },
    { id: 'passing',      name: 'Passe',            description: 'Qualidade de distribuição curta e longa.' },
    { id: 'ball_control', name: 'Condução',         description: 'Controle da bola em velocidade.' },
    { id: 'positioning',  name: 'Posicionamento',   description: 'Inteligência tática com e sem a bola.' },
    { id: 'physicality',  name: 'Físico',           description: 'Equilíbrio, força e resistência em 90 min.' },
  ],
  volleyball: [
    { id: 'attack',     name: 'Ataque',         description: 'Potência e ângulo de cortada.' },
    { id: 'setting',    name: 'Levantamento',   description: 'Precisão na armação de jogadas.' },
    { id: 'reception',  name: 'Recepção',       description: 'Controle de bola no passe e defesa.' },
    { id: 'blocking',   name: 'Bloqueio',       description: 'Timing e cobertura de rede.' },
    { id: 'serve',      name: 'Saque',          description: 'Variedade (viagem, flutuante) e precisão.' },
  ],
};

/** Avaliação de desempenho de um usuário em uma habilidade dentro de uma sessão de jogo. */
export interface SportSessionRating {
  id: string;
  evaluatedUserId: string;           // usuário sendo avaliado
  evaluatorUserId: string;           // usuário que realizou a avaliação
  sessionId: string;                 // sessão em que ocorreu a avaliação
  groupId: string;                   // grupo ao qual a sessão pertence
  sport: Sport;
  skillId: string;
  rating: number;                    // 1–10
  attributes: Record<string, unknown>; // dados extras livres
  desconsiderar: boolean;            // quando true, excluído do cálculo de médias
  createdAt: string;
  updatedAt: string;
}

export const MIN_SKILL_RATING = 1;
export const MAX_SKILL_RATING = 10;

/** Retorna as definições de habilidades para um esporte, ou [] se não encontrado. */
export function getSkillsForSport(sport: Sport): SportSkillDefinition[] {
  return SPORTS_SKILL_REGISTRY[sport] ?? [];
}

/** Converte um array de SkillRating em um mapa { skillId → rating } para lookup rápido. */
export function ratingsToMap(ratings: SkillRating[]): Record<string, number> {
  return Object.fromEntries(ratings.map((r) => [r.skillId, r.rating]));
}
