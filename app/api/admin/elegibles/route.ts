import { isAdmin } from "../../../admin-auth";

export async function GET(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ ok: false }, { status: 401 });
  const { env } = await import("cloudflare:workers");
  const rows = await env.DB.prepare(
    "SELECT t.codigo FROM tickets t LEFT JOIN participantes p ON p.id=t.participante_id LEFT JOIN ganadores g ON g.ticket_id=t.id WHERE ((t.tipo='digital' AND p.estado='aprobado') OR (t.tipo='fisico' AND t.estado='vendido' AND t.comprador_dni IS NOT NULL)) AND g.id IS NULL ORDER BY t.id",
  ).all<{ codigo: string }>();
  return Response.json({ ok: true, total: rows.results.length, codigos: rows.results.map(r => r.codigo) }, { headers: { "Cache-Control": "no-store" } });
}
