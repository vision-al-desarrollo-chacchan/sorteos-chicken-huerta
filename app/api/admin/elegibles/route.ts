import { isAdmin } from "../../../admin-auth";
import { rest } from "@/lib/supabase-server";

export async function GET(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ ok: false }, { status: 401 });
  const [tickets, participants, winners] = await Promise.all([
    rest<Array<{ id: number; codigo: string; tipo: string; estado: string; participante_id: number | null; comprador_dni: string | null }>>("tickets", "select=id,codigo,tipo,estado,participante_id,comprador_dni&order=id.asc"),
    rest<Array<{ id: number; estado: string }>>("participantes", "select=id,estado&estado=eq.aprobado"),
    rest<Array<{ ticket_id: number }>>("ganadores", "select=ticket_id"),
  ]);
  const approved = new Set(participants.map((row) => row.id));
  const used = new Set(winners.map((row) => row.ticket_id));
  const codigos = tickets.filter((ticket) => !used.has(ticket.id) && ((ticket.tipo === "digital" && ticket.participante_id && approved.has(ticket.participante_id)) || (ticket.tipo === "fisico" && ticket.estado === "vendido" && ticket.comprador_dni))).map((ticket) => ticket.codigo);
  return Response.json({ ok: true, total: codigos.length, codigos }, { headers: { "Cache-Control": "no-store" } });
}
