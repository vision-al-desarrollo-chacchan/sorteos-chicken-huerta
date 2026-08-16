import { isAdmin } from "../../../admin-auth";
import { rest, rpc } from "@/lib/supabase-server";

export async function GET(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ ok: false }, { status: 401 });
  const rows = await rest<Array<Record<string, unknown>>>("tickets", "select=id,codigo,estado,comprador_nombre,comprador_dni,comprador_celular,creado&tipo=eq.fisico&order=id.desc&limit=1000");
  const tickets = rows.map((row) => ({ ...row, compradorNombre: row.comprador_nombre, compradorDni: row.comprador_dni, compradorCelular: row.comprador_celular }));
  return Response.json({ ok: true, tickets });
}

export async function POST(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ ok: false }, { status: 401 });
  const { cantidad } = (await request.json()) as { cantidad?: number };
  if (!Number.isInteger(cantidad) || !cantidad || cantidad < 1 || cantidad > 100) return Response.json({ ok: false, message: "Elige entre 1 y 100 tickets." }, { status: 400 });
  const tickets = await rpc<string[]>("generar_tickets_fisicos", { p_cantidad: cantidad });
  return Response.json({ ok: true, tickets });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ ok: false }, { status: 401 });
  const { id, estado, nombre, dni, celular } = (await request.json()) as { id?: number; estado?: string; nombre?: string; dni?: string; celular?: string };
  if (!Number.isInteger(id) || !["disponible", "vendido", "anulado"].includes(estado || "")) return Response.json({ ok: false }, { status: 400 });
  if (estado === "vendido" && ((nombre || "").trim().length < 3 || !/^\d{8}$/.test(dni || "") || !/^9\d{8}$/.test(celular || ""))) return Response.json({ ok: false, message: "Para vender registra nombre, DNI y celular válidos." }, { status: 400 });
  await rest("tickets", `id=eq.${id}&tipo=eq.fisico`, { method: "PATCH", body: JSON.stringify({ estado, comprador_nombre: estado === "vendido" ? nombre!.trim() : null, comprador_dni: estado === "vendido" ? dni : null, comprador_celular: estado === "vendido" ? celular : null }) });
  await rest("auditoria", "", { method: "POST", body: JSON.stringify({ accion: "TICKET_FISICO", detalle: `Ticket ${id}: ${estado}${nombre ? ` - ${nombre}` : ""}`, administrador: "administrador" }) });
  return Response.json({ ok: true });
}
