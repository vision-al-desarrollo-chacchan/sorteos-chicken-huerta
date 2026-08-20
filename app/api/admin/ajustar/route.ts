import { isAdmin } from "../../../admin-auth";
import { rest, rpc } from "@/lib/supabase-server";

type Participant = { id: number; cantidad: number; estado: string };
type Ticket = { id: number; codigo: string };

export async function PATCH(request: Request) {
  if (!(await isAdmin(request)))
    return Response.json({ ok: false, message: "Acceso no autorizado." }, { status: 401 });

  const { id, cantidad } = (await request.json()) as { id?: number; cantidad?: number };
  if (!Number.isInteger(id) || !Number.isInteger(cantidad) || !cantidad || cantidad < 1 || cantidad > 100)
    return Response.json({ ok: false, message: "La cantidad debe estar entre 1 y 100." }, { status: 400 });

  const [participants, config] = await Promise.all([
    rest<Participant[]>("participantes", `select=id,cantidad,estado&id=eq.${id}&limit=1`),
    rest<Array<{ valor: string }>>("configuracion", "select=valor&clave=eq.precio_ticket&limit=1"),
  ]);
  const participant = participants[0];
  if (!participant)
    return Response.json({ ok: false, message: "El participante ya no existe." }, { status: 404 });

  const currentTickets = await rest<Ticket[]>(
    "tickets",
    `select=id,codigo&participante_id=eq.${id}&tipo=eq.digital&order=id.asc`,
  );
  const diferencia = cantidad - currentTickets.length;

  if (diferencia > 0) {
    const codigos = await rpc<string[]>("generar_tickets_fisicos", { p_cantidad: diferencia });
    if (!Array.isArray(codigos) || codigos.length !== diferencia)
      return Response.json({ ok: false, message: "No se pudieron reservar los tickets adicionales." }, { status: 500 });
    const filtro = codigos.map((codigo) => `"${codigo.replaceAll('"', '')}"`).join(",");
    await rest("tickets", `codigo=in.(${encodeURIComponent(filtro)})&tipo=eq.fisico`, {
      method: "PATCH",
      body: JSON.stringify({
        participante_id: id,
        tipo: "digital",
        estado: participant.estado,
        comprador_nombre: null,
        comprador_dni: null,
        comprador_celular: null,
      }),
    });
  } else if (diferencia < 0) {
    const sobrantes = currentTickets.slice(cantidad);
    const ids = sobrantes.map((ticket) => ticket.id).join(",");
    const winners = await rest<Array<{ ticket_id: number }>>(
      "ganadores",
      `select=ticket_id&ticket_id=in.(${ids})&limit=1`,
    );
    if (winners.length)
      return Response.json({ ok: false, message: "No se puede retirar un ticket que ya resultó ganador." }, { status: 409 });
    await rest("tickets", `id=in.(${ids})`, { method: "DELETE" });
  }

  const precio = Math.max(1, Number(config[0]?.valor || 5));
  await rest("participantes", `id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ cantidad, monto: cantidad * precio, actualizado: new Date().toISOString() }),
  });
  await rest("auditoria", "", {
    method: "POST",
    body: JSON.stringify({
      accion: "AJUSTAR_TICKETS",
      detalle: `Participante ${id}: ${currentTickets.length} a ${cantidad} tickets; monto S/${cantidad * precio}`,
      administrador: "administrador",
      creado: new Date().toISOString(),
    }),
  });

  return Response.json({ ok: true, cantidad, monto: cantidad * precio });
}
