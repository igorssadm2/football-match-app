/** ACL para ações de organizador na tela do pré-jogo (PRD §6). */

export interface GroupAclPayload {
  owner?: { user_id?: string };
  owner_id?: string;
  members?: { user_id?: string; userId?: string; role?: string }[];
  settings?: { sport?: string };
}

export function canManagePregame(
  currentUserId: string | undefined,
  pregameCreatedBy: string | undefined,
  group: GroupAclPayload | null
): boolean {
  if (!currentUserId) return false;
  if (pregameCreatedBy && currentUserId === pregameCreatedBy) return true;
  if (!group) return false;
  if (group.owner?.user_id && group.owner.user_id === currentUserId) return true;
  if (group.owner_id && String(group.owner_id) === currentUserId) return true;
  const m = group.members?.find((x) => (x.user_id ?? x.userId) === currentUserId);
  return m?.role === "admin";
}

export function groupSportFromPayload(group: GroupAclPayload | null): string | undefined {
  const s = group?.settings?.sport;
  return typeof s === "string" && s.length > 0 ? s : undefined;
}
