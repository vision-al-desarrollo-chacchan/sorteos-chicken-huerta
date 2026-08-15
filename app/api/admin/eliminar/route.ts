import { isAdmin } from "../../../admin-auth";
async function resources() {
  const { env } = await import("cloudflare:workers");
  return env as typeof env & { BUCKET: R2Bucket };
}
export async function DELETE(request: Request) {
  const { DB, BUCKET } = await resources();
  if (!(await isAdmin(request)))
    return Response.json(
      { ok: false, message: "Acceso no autorizado." },
      { status: 401 },
    );
  const { id } = (await request.json()) as { id?: number };
  if (!Number.isInteger(id))
    return Response.json(
      { ok: false, message: "Registro inválido." },
      { status: 400 },
    );
  const participante = await DB.prepare(
    "SELECT comprobante_key AS comprobanteKey FROM participantes WHERE id=?",
  )
    .bind(id)
    .first<{ comprobanteKey: string | null }>();
  if (!participante)
    return Response.json(
      { ok: false, message: "El registro ya no existe." },
      { status: 404 },
    );
  await DB.batch([
    DB.prepare(
      "DELETE FROM ganadores WHERE ticket_id IN (SELECT id FROM tickets WHERE participante_id=?)",
    ).bind(id),
    DB.prepare(
      "DELETE FROM tickets WHERE participante_id=? AND tipo='digital'",
    ).bind(id),
    DB.prepare("DELETE FROM participantes WHERE id=?").bind(id),
  ]);
  if (participante.comprobanteKey)
    await BUCKET.delete(participante.comprobanteKey);
  return Response.json({ ok: true });
}
