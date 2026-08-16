import { isAdmin } from "../../../admin-auth";
import { deleteReceipt, rest } from "@/lib/supabase-server";

export async function DELETE(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ ok: false, message: "Acceso no autorizado." }, { status: 401 });
  const { id } = (await request.json()) as { id?: number };
  if (!Number.isInteger(id)) return Response.json({ ok: false, message: "Registro inválido." }, { status: 400 });
  const rows = await rest<Array<{ comprobante_key: string | null }>>("participantes", `select=comprobante_key&id=eq.${id}&limit=1`);
  const participant = rows[0];
  if (!participant) return Response.json({ ok: false, message: "El registro ya no existe." }, { status: 404 });
  await rest("participantes", `id=eq.${id}`, { method: "DELETE" });
  if (participant.comprobante_key) await deleteReceipt(participant.comprobante_key);
  return Response.json({ ok: true });
}
