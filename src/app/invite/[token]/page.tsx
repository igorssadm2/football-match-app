import { getSession } from "@/lib/firebase/session";
import InviteClient from "./InviteClient";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3100";

interface InvitationPreview {
  id: string;
  group_id: string;
  group_name?: string;
  groupName?: string;
  token: string;
  status: string;
  is_valid: boolean;
  is_expired: boolean;
  is_exhausted: boolean;
  max_uses: number;
  current_uses: number;
  expires_at: string;
  created_at: string;
}

type Props = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: Props) {
  const { token } = await params;

  const session = await getSession().catch(() => null);

  let preview: InvitationPreview | null = null;
  let error: string | null = null;

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/invitations/${token}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      error = data?.message ?? (res.status === 404 ? "Convite não encontrado." : "Erro ao carregar convite.");
    } else {
      preview = (await res.json()) as InvitationPreview;
    }
  } catch {
    error = "Não foi possível conectar ao servidor.";
  }

  return (
    <InviteClient
      token={token}
      preview={preview}
      error={error}
      isLoggedIn={!!session}
    />
  );
}
