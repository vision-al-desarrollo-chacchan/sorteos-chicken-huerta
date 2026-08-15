import { isAdmin } from "../../admin-auth";
async function resources() {
  const { env } = await import("cloudflare:workers");
  return env as typeof env;
}
function who() {
  return "administrador";
}
async function setup(db: D1Database) {
  await db.batch([
    db.prepare(
      "CREATE TABLE IF NOT EXISTS participantes(id INTEGER PRIMARY KEY AUTOINCREMENT,nombre TEXT NOT NULL,dni TEXT NOT NULL,celular TEXT NOT NULL,operacion TEXT NOT NULL,cantidad INTEGER NOT NULL DEFAULT 1,monto INTEGER NOT NULL DEFAULT 5,comprobante_key TEXT,estado TEXT NOT NULL DEFAULT 'pendiente',creado TEXT NOT NULL,actualizado TEXT)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS tickets(id INTEGER PRIMARY KEY AUTOINCREMENT,codigo TEXT NOT NULL UNIQUE,participante_id INTEGER,tipo TEXT NOT NULL DEFAULT 'digital',estado TEXT NOT NULL DEFAULT 'pendiente',comprador_nombre TEXT,comprador_dni TEXT,comprador_celular TEXT,creado TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS ganadores(id INTEGER PRIMARY KEY AUTOINCREMENT,premio INTEGER NOT NULL UNIQUE,ticket_id INTEGER NOT NULL UNIQUE,codigo TEXT NOT NULL,participante_id INTEGER NOT NULL,nombre TEXT NOT NULL,dni TEXT NOT NULL,creado TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS auditoria(id INTEGER PRIMARY KEY AUTOINCREMENT,accion TEXT NOT NULL,detalle TEXT NOT NULL,administrador TEXT NOT NULL,creado TEXT NOT NULL)",
    ),
  ]);
}
async function log(
  db: D1Database,
  r: Request,
  accion: string,
  detalle: string,
) {
  await db
    .prepare(
      "INSERT INTO auditoria(accion,detalle,administrador,creado) VALUES(?,?,?,?)",
    )
    .bind(accion, detalle, who(), new Date().toISOString())
    .run();
}
export async function GET(request: Request) {
  const { DB } = await resources();
  if (!(await isAdmin(request)))
    return Response.json({ ok: false }, { status: 401 });
  await setup(DB);
  const [rows, winners, audit] = await Promise.all([
    DB.prepare(
      "SELECT p.id,p.nombre,p.dni,p.celular,p.operacion,p.cantidad,p.monto,p.estado,p.creado,p.comprobante_key AS comprobanteKey,GROUP_CONCAT(t.codigo, ', ') AS tickets FROM participantes p LEFT JOIN tickets t ON t.participante_id=p.id GROUP BY p.id ORDER BY p.id DESC LIMIT 1000",
    ).all(),
    DB.prepare("SELECT * FROM ganadores ORDER BY premio").all(),
    DB.prepare("SELECT * FROM auditoria ORDER BY id DESC LIMIT 50").all(),
  ]);
  return Response.json({
    ok: true,
    registros: rows.results,
    ganadores: winners.results,
    auditoria: audit.results,
  });
}
export async function PATCH(request: Request) {
  const { DB } = await resources();
  if (!(await isAdmin(request)))
    return Response.json({ ok: false }, { status: 401 });
  const b = (await request.json()) as { id?: number; estado?: string };
  if (
    !Number.isInteger(b.id) ||
    !["aprobado", "rechazado", "pendiente"].includes(b.estado || "")
  )
    return Response.json({ ok: false }, { status: 400 });
  await setup(DB);
  await DB.batch([
    DB.prepare(
      "UPDATE participantes SET estado=?,actualizado=? WHERE id=?",
    ).bind(b.estado, new Date().toISOString(), b.id),
    DB.prepare(
      "UPDATE tickets SET estado=? WHERE participante_id=? AND tipo='digital'",
    ).bind(b.estado, b.id),
  ]);
  await log(DB, request, "ESTADO", `Registro ${b.id}: ${b.estado}`);
  return Response.json({ ok: true });
}
export async function POST(request: Request) {
  const { DB } = await resources();
  if (!(await isAdmin(request)))
    return Response.json({ ok: false }, { status: 401 });
  await setup(DB);
  const { premio } = (await request.json()) as { premio?: number };
  if (premio !== 1 && premio !== 2)
    return Response.json(
      { ok: false, message: "Premio inválido." },
      { status: 400 },
    );
  if (
    await DB.prepare("SELECT id FROM ganadores WHERE premio=?")
      .bind(premio)
      .first()
  )
    return Response.json(
      { ok: false, message: "Este premio ya fue sorteado." },
      { status: 409 },
    );
  const row = await DB.prepare(
    "SELECT t.id ticketId,t.codigo,COALESCE(p.id,0) participanteId,COALESCE(p.nombre,t.comprador_nombre,'PORTADOR') nombre,COALESCE(p.dni,t.comprador_dni,'POR IDENTIFICAR') dni FROM tickets t LEFT JOIN participantes p ON p.id=t.participante_id LEFT JOIN ganadores g ON g.ticket_id=t.id WHERE ((t.tipo='digital' AND p.estado='aprobado') OR (t.tipo='fisico' AND t.estado='vendido' AND t.comprador_dni IS NOT NULL)) AND g.id IS NULL ORDER BY RANDOM() LIMIT 1",
  ).first<{
    ticketId: number;
    codigo: string;
    participanteId: number;
    nombre: string;
    dni: string;
  }>();
  if (!row)
    return Response.json(
      { ok: false, message: "No hay tickets aprobados disponibles." },
      { status: 400 },
    );
  await DB.prepare(
    "INSERT INTO ganadores(premio,ticket_id,codigo,participante_id,nombre,dni,creado) VALUES(?,?,?,?,?,?,?)",
  )
    .bind(
      premio,
      row.ticketId,
      row.codigo,
      row.participanteId,
      row.nombre,
      row.dni,
      new Date().toISOString(),
    )
    .run();
  await log(
    DB,
    request,
    "GANADOR",
    `${premio} premio: ${row.codigo} - ${row.nombre}`,
  );
  return Response.json({
    ok: true,
    message: `Ganador: ${row.codigo} - ${row.nombre}`,
    ganador: { premio, codigo: row.codigo, nombre: row.nombre },
  });
}
export async function DELETE(request: Request) {
  const { DB } = await resources();
  if (!(await isAdmin(request)))
    return Response.json({ ok: false }, { status: 401 });
  const { premio } = (await request.json()) as { premio?: number };
  if (premio !== 1 && premio !== 2)
    return Response.json({ ok: false }, { status: 400 });
  const winner = await DB.prepare("SELECT codigo FROM ganadores WHERE premio=?")
    .bind(premio)
    .first<{ codigo: string }>();
  await DB.prepare("DELETE FROM ganadores WHERE premio=?").bind(premio).run();
  await log(
    DB,
    request,
    "ANULAR_GANADOR",
    `${premio} premio: ${winner?.codigo || "sin ganador"}`,
  );
  return Response.json({ ok: true });
}
