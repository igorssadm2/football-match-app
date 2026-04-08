export type PreGameType = "standard" | "extra";
export type PreGameStatus = "open" | "draft" | "cancelled" | "completed";
export type PreGameVisibility = "private" | "public_to_fill_spots";
export type PreGameEntryMode = "automatic" | "approval_required";
export type ParticipantStatus = "invited" | "confirmed" | "pending" | "waiting" | "declined" | "rejected";

export interface PreGame {
  id: string;
  group_id: string;
  created_by?: string;
  name: string;
  type: PreGameType;
  status: PreGameStatus;
  match_date: string;
  starts_at: string;
  ends_at?: string | null;
  location_name: string;
  location_details?: string | null;
  min_players: number;
  max_players: number;
  allow_waiting_list: boolean;
  visibility: PreGameVisibility;
  entry_mode: PreGameEntryMode;
  join_deadline?: string | null;
  cancellation_deadline?: string | null;
  notes?: string | null;
  members_priority_deadline?: string | null;

  team_format?: string | null;
  /** Persistido no pré-jogo; opcional, ≥ 2 e ≤ max_players quando definido. */
  players_per_team?: number | null;
  /** Somente leitura (ex.: derivado de team_format tipo 5x5). */
  suggested_players_per_team?: number | null;
  members_price?: number | null;
  guest_price?: number | null;
  flat_price?: number | null;

  participants_count?: number;
  pending_count?: number;
  waiting_count?: number;
  invited_count?: number;
  declined_count?: number;
  spots_left?: number;

  created_at: string;
  updated_at?: string;
}

export interface ManualProfileSummary {
  id?: string;
  display_name?: string;
  sport?: string;
  attributes?: Record<string, unknown>;
}

export interface Participant {
  id: string;
  /** Ausente ou vazio para convidados sombra sem conta */
  user_id?: string | null;
  guest_name?: string;
  name?: string;
  picture_url?: string;
  manual_profile_id?: string;
  manual_profile?: ManualProfileSummary;
  status: ParticipantStatus;
  joined_at?: string;
  declined_at?: string;
  updated_at?: string;
}

export interface PreGameParticipantsResponse {
  confirmed: Participant[];
  pending: Participant[];
  waiting: Participant[];
  invited: Participant[];
  declined: Participant[];
  total: number;
  spots_left: number;
}

export interface PreGameInvitation {
  id: string;
  pregame_id: string;
  token: string;
  status: string;
  max_uses: number;
  current_uses: number;
  expires_at: string;
  created_at: string;
}

export interface AddGuestResponse {
  participant_id: string;
  pregame_id: string;
  guest_name: string;
  manual_profile_id?: string;
  status: "confirmed" | "waiting";
  joined_at: string;
}

export interface ManualPlayerItem {
  id: string;
  display_name: string;
  sport?: string;
  attributes?: Record<string, unknown>;
  updated_at?: string;
}

export interface ManualPlayersListResponse {
  items: ManualPlayerItem[];
}

export interface SkillDefinition {
  id: string;
  name: string;
  description?: string;
  min_value: number;
  max_value: number;
}

export interface ForceRemoveResponse {
  participant_id: string;
  was_confirmed: boolean;
  promoted_participant_id?: string;
}

export interface WhatsAppTextResponse {
  text: string;
}

export interface TeamDrawPlayer {
  participant_id: string;
  name: string;
  overall: number;
}

export interface TeamDrawTeam {
  id: string;
  name: string;
  players: TeamDrawPlayer[];
}

export interface TeamDrawResponse {
  draw_run_id: string;
  pregame_id: string;
  num_teams: number;
  seed_used: number;
  /** Default do backend quando omitido na API legada: true */
  balance_by_overall: boolean;
  /** Presente quando o run foi criado com PPT. */
  players_per_team?: number | null;
  balance_goalkeepers: boolean;
  is_confirmed: boolean;
  confirmed_at?: string | null;
  teams: TeamDrawTeam[];
}

export interface TeamDrawCreateRequest {
  /** Fluxo legado: obrigatório quando `players_per_team` não é enviado. */
  num_teams?: number;
  /** Se presente, o servidor calcula num_teams e ignora `num_teams` do body. */
  players_per_team?: number;
  force_below_min: boolean;
  /** Omitir ou true = balancear por overall; false = ordem pseudoaleatória antes do snake */
  balance_by_overall?: boolean;
  balance_goalkeepers?: boolean;
}

export interface TeamDrawWhatsAppTextResponse {
  text: string;
}
