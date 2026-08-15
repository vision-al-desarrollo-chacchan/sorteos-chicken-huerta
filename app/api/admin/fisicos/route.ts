import { isAdmin } from "../../../admin-auth";
async function envs() {
  const { env } = await import("cloudflare:workers");
  return env as typeof env;
}
function email() {
  return "administrador";
}
async function setup(db: D1Database) {
  await db.batch([
    db.prepare(
      "CREATE TABLE IF NOT EXISTS tickets(id INTEGER PRIMARY KEY AUTOINCREMENT,codigo TEXT NOT NULL UNIQUE,participante_id INTEGER,tipo TEXT NOT NULL DEFAULT 'digital',estado TEXT NOT NULL DEFAULT 'pendiente',comprador_nombre TEXT,comprador_dni TEXT,comprador_celular TEXT,creado TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS auditoria(id INTEGER PRIMARY KEY AUTOINCREMENT,accion TEXT NOT NULL,detalle TEXT NOT NULL,administrador TEXT NOT NULL,creado TEXT NOT NULL)",
    ),
  ]);
}
async function log(db: D1Database, r: Request, a: string, d: string) {
  await db
    .prepare(
      "INSERT INTO auditoria(accion,detalle,administrador,creado) VALUES(?,?,?,?)",
    )
    .bind(a, d, email(), new Date().toISOString())
    .run();
}
export async function GET(r: Request) {
  const { DB } = await envs();
  if (!(await isAdmin(r))) return Response.json({ ok: false }, { status: 401 });
  await setup(DB);
  const rows = await DB.prepare(
    "SELECT id,codigo,estado,comprador_nombre AS compradorNombre,comprador_dni AS compradorDni,comprador_celular AS compradorCelular,creado FROM tickets WHERE tipo='fisico' ORDER BY id DESC LIMIT 1000",
  ).all();
  return Response.json({ ok: true, tickets: rows.results });
}
export async function POST(r: Request) {
  const { DB } = await envs();
  if (!(await isAdmin(r))) return Response.json({ ok: false }, { status: 401 });
  await setup(DB);
  const { cantidad } = (await r.json()) as { cantidad?: number };
  if (
    !Number.isInteger(cantidad) ||
    !cantidad ||
    cantidad < 1 ||
    cantidad > 100
  )
    return Response.json(
      { ok: false, message: "Elige entre 1 y 100 tickets." },
      { status: 400 },
    );
  const now = new Date().toISOString(),
    created: string[] = [];
  for (let i = 0; i < cantidad; i++) {
    const row = await DB.prepare(
      "INSERT INTO tickets(codigo,participante_id,tipo,estado,creado) VALUES(?,NULL,'fisico','disponible',?) RETURNING id",
    )
      .bind(`TMP-${crypto.randomUUID()}`, now)
      .first<{ id: number }>();
    if (!row) throw new Error();
    const codigo = `CH-${String(row.id).padStart(6, "0")}`;
    await DB.prepare("UPDATE tickets SET codigo=? WHERE id=?")
      .bind(codigo, row.id)
      .run();
    created.push(codigo);
  }
  await log(
    DB,
    r,
    "GENERAR_FISICOS",
    `${cantidad} tickets: ${created[0]} a ${created.at(-1)}`,
  );
  return Response.json({ ok: true, tickets: created });
}
export async function PATCH(r: Request) {
  const { DB } = await envs();
  if (!(await isAdmin(r))) return Response.json({ ok: false }, { status: 401 });
  const { id, estado, nombre, dni, celular } = (await r.json()) as {
    id?: number;
    estado?: string;
    nombre?: string;
    dni?: string;
    celular?: string;
  };
  if (
    !Number.isInteger(id) ||
    !["disponible", "vendido", "anulado"].includes(estado || "")
  )
    return Response.json({ ok: false }, { status: 400 });
  if (
    estado === "vendido" &&
    ((nombre || "").trim().length < 3 ||
      !/^\d{8}$/.test(dni || "") ||
      !/^9\d{8}$/.test(celular || ""))
  )
    return Response.json(
      {
        ok: false,
        message: "Para vender registra nombre, DNI y celular válidos.",
      },
      { status: 400 },
    );
  await setup(DB);
  await DB.prepare(
    "UPDATE tickets SET estado=?,comprador_nombre=?,comprador_dni=?,comprador_celular=? WHERE id=? AND tipo='fisico'",
  )
    .bind(
      estado,
      estado === "vendido" ? nombre!.trim() : null,
      estado === "vendido" ? dni : null,
      estado === "vendido" ? celular : null,
      id,
    )
    .run();
  await log(
    DB,
    r,
    "TICKET_FISICO",
    `Ticket ${id}: ${estado}${nombre ? ` - ${nombre}` : ""}`,
  );
  return Response.json({ ok: true });
}
