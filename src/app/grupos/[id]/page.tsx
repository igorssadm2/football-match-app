import { redirect } from "next/navigation";
import { getSession } from "@/lib/firebase/session";
import GroupDetail from "./GroupDetail";

type Props = { params: Promise<{ id: string }> };

export default async function GrupoPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  return <GroupDetail groupId={id} />;
}
