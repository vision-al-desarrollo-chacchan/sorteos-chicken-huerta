import { isAdmin } from "../../admin-auth";
import { rest, rpc } from "@/lib/supabase-server";

type Participant = { id: number; nombre: string; dni: string; celular: string; operacion: string; cantidad: number; monto: number; estado: string; creado: string; comprobante_key: string | null };

export async function GET(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ ok: false }, { status: 401 });
  const [participants, tickets, winners, audit] = await Promise.all([
    rest<Participant[]>("participantes", "select=id,nombre,dni,celular,operacion,cantidad,monto,estado,creado,comprobante_key&order=id.desc&limit=1000"),
    rest<Array<{ participante_id: number | null; codigo: string }>>("tickets", "select=participante_id,codigo&tipo=eq.digital&order=id.asc"),
    rest<Array<Record<string, unknown>>>("ganadores", "select=*&order=premio.asc"),
    rest<Array<Record<string, unknown>>>("auditoria", "select=*&order=id.desc&limit=50"),
  ]);
  const byParticipant = new Map<number, string[]>();
  for (const ticket of tickets) if (ticket.participante_id) byParticipant.set(ticket.participante_id, [...(byParticipant.get(ticket.participante_id) || []), ticket.codigo]);
  const registros = participants.map((participant) => ({ ...participant, comprobanteKey: participant.comprobante_key, tickets: (byParticipant.get(participant.id) || []).join(", ") }));
  return Response.json({ ok: true, registros, ganadores: winners, auditoria: audit });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ ok: false }, { status: 401 });
  const { id, estado } = (await request.json()) as { id?: number; estado?: string };
  if (!Number.isInteger(id) || !["aprobado", "rechazado", "pendiente"].includes(estado || "")) return Response.json({ ok: false }, { status: 400 });
  await rpc("actualizar_estado_participante", { p_id: id, p_estado: estado });
  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ ok: false }, { status: 401 });
  const { premio } = (await request.json()) as { premio?: number };
  if (premio !== 1 && premio !== 2) return Response.json({ ok: false, message: "Premio inválido." }, { status: 400 });
  try {
    const ganador = await rpc<{ premio: number; codigo: string; nombre: string }>("sortear_ganador", { p_premio: premio });
    return Response.json({ ok: true, message: `Ganador: ${ganador.codigo} - ${ganador.nombre}`, ganador });
  } catch {
    const existing = await rest<Array<{ id: number }>>("ganadores", `select=id&premio=eq.${premio}&limit=1`);
    return Response.json({ ok: false, message: existing.length ? "Este premio ya fue sorteado." : "No hay tickets aprobados disponibles." }, { status: existing.length ? 409 : 400 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ ok: false }, { status: 401 });
  const { premio } = (await request.json()) as { premio?: number };
  if (premio !== 1 && premio !== 2) return Response.json({ ok: false }, { status: 400 });
  const rows = await rest<Array<{ codigo: string }>>("ganadores", `select=codigo&premio=eq.${premio}&limit=1`);
  await rest("ganadores", `premio=eq.${premio}`, { method: "DELETE" });
  await rest("auditoria", "", { method: "POST", body: JSON.stringify({ accion: "ANULAR_GANADOR", detalle: `${premio} premio: ${rows[0]?.codigo || "sin ganador"}`, administrador: "administrador" }) });
  return Response.json({ ok: true });
}
