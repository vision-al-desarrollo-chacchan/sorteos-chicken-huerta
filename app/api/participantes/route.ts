async function bindings() {
  const { env } = await import("cloudflare:workers");
  return env as typeof env & { BUCKET: R2Bucket };
}
async function setup() {
  const { DB: db } = await bindings();
  await db.batch([
    db.prepare(
      "CREATE TABLE IF NOT EXISTS participantes (id INTEGER PRIMARY KEY AUTOINCREMENT,nombre TEXT NOT NULL,dni TEXT NOT NULL,celular TEXT NOT NULL,operacion TEXT NOT NULL,cantidad INTEGER NOT NULL DEFAULT 1,monto INTEGER NOT NULL DEFAULT 5,comprobante_key TEXT,estado TEXT NOT NULL DEFAULT 'pendiente',creado TEXT NOT NULL,actualizado TEXT)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS tickets (id INTEGER PRIMARY KEY AUTOINCREMENT,codigo TEXT NOT NULL UNIQUE,participante_id INTEGER,tipo TEXT NOT NULL DEFAULT 'digital',estado TEXT NOT NULL DEFAULT 'pendiente',comprador_nombre TEXT,comprador_dni TEXT,comprador_celular TEXT,creado TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS configuracion (clave TEXT PRIMARY KEY,valor TEXT NOT NULL,actualizado TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS tickets_codigo_idx ON tickets(codigo)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS participantes_estado_idx ON participantes(estado)",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS participantes_operacion_unique ON participantes(operacion)",
    ),
  ]);
  return db;
}
function horaPeru(value: string) {
  return /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}:00-05:00`;
}
export async function POST(request: Request) {
  let key = "";
  try {
    const { BUCKET } = await bindings(),
      db = await setup();
    const dates = await db
        .prepare(
          "SELECT clave,valor FROM configuracion WHERE clave IN ('inicio_sorteo','fin_sorteo','precio_ticket')",
        )
        .all<{ clave: string; valor: string }>(),
      cfg = Object.fromEntries(dates.results.map((x) => [x.clave, x.valor])),
      nowMs = Date.now(),
      precio = Math.max(1, Number(cfg.precio_ticket || 5));
    if (cfg.inicio_sorteo && nowMs < Date.parse(horaPeru(cfg.inicio_sorteo)))
      return Response.json(
        { ok: false, message: "La venta todavía no ha comenzado." },
        { status: 403 },
      );
    if (cfg.fin_sorteo && nowMs > Date.parse(horaPeru(cfg.fin_sorteo)))
      return Response.json(
        { ok: false, message: "La venta de tickets ya finalizó." },
        { status: 403 },
      );
    const form = await request.formData(),
      nombre = String(form.get("nombre") ?? "")
        .trim()
        .replace(/\s+/g, " "),
      dni = String(form.get("dni") ?? "").trim(),
      celular = String(form.get("celular") ?? "").trim(),
      operacion = String(form.get("operacion") ?? "").trim(),
      cantidad = Number(form.get("cantidad")),
      comprobante = form.get("comprobante"),
      allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (
      nombre.length < 3 ||
      nombre.length > 100 ||
      !/^\d{8}$/.test(dni) ||
      !/^9\d{8}$/.test(celular) ||
      !/^[a-zA-Z0-9-]{4,40}$/.test(operacion) ||
      !Number.isInteger(cantidad) ||
      cantidad < 1 ||
      cantidad > 100 ||
      !(comprobante instanceof File) ||
      comprobante.size < 1 ||
      comprobante.size > 5_000_000 ||
      !allowed.includes(comprobante.type)
    )
      return Response.json(
        {
          ok: false,
          message:
            "Revisa tus datos. El celular debe comenzar en 9 y el comprobante debe ser válido.",
        },
        { status: 400 },
      );
    if (
      await db
        .prepare(
          "SELECT id FROM participantes WHERE operacion=? COLLATE NOCASE LIMIT 1",
        )
        .bind(operacion)
        .first()
    )
      return Response.json(
        { ok: false, message: "Este número de operación ya fue registrado." },
        { status: 409 },
      );
    const now = new Date().toISOString(),
      ext =
        comprobante.name
          .split(".")
          .pop()
          ?.replace(/[^a-z0-9]/gi, "")
          .toLowerCase() || "bin";
    key = `comprobantes/${now.slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
    await BUCKET.put(key, await comprobante.arrayBuffer(), {
      httpMetadata: { contentType: comprobante.type },
    });
    const p = await db
      .prepare(
        "INSERT INTO participantes(nombre,dni,celular,operacion,cantidad,monto,comprobante_key,estado,creado) VALUES(?,?,?,?,?,?,?,?,?) RETURNING id",
      )
      .bind(
        nombre,
        dni,
        celular,
        operacion,
        cantidad,
        cantidad * precio,
        key,
        "pendiente",
        now,
      )
      .first<{ id: number }>();
    if (!p) throw new Error();
    const created: string[] = [];
    for (let i = 0; i < cantidad; i++) {
      const row = await db
        .prepare(
          "INSERT INTO tickets(codigo,participante_id,tipo,estado,creado) VALUES(?,?,'digital','pendiente',?) RETURNING id",
        )
        .bind(`TMP-${crypto.randomUUID()}`, p.id, now)
        .first<{ id: number }>();
      if (!row) throw new Error();
      const codigo = `CH-${String(row.id).padStart(6, "0")}`;
      await db
        .prepare("UPDATE tickets SET codigo=? WHERE id=?")
        .bind(codigo, row.id)
        .run();
      created.push(codigo);
    }
    return Response.json({ ok: true, tickets: created });
  } catch {
    if (key)
      try {
        const { BUCKET } = await bindings();
        await BUCKET.delete(key);
      } catch {}
    return Response.json(
      {
        ok: false,
        message: "No pudimos completar el registro. Intenta nuevamente.",
      },
      { status: 500 },
    );
  }
}
export async function GET(request: Request) {
  try {
    const db = await setup(),
      url = new URL(request.url),
      codigo = url.searchParams.get("ticket")?.trim().toUpperCase(),
      identidad = url.searchParams.get("identidad")?.trim();
    if (!codigo || !/^CH-\d{6,}$/.test(codigo))
      return Response.json({ encontrado: false });
    const row = await db
      .prepare(
        "SELECT t.codigo AS ticket,t.tipo,t.estado AS ticketEstado,COALESCE(p.nombre,t.comprador_nombre,'PORTADOR') AS nombre,p.dni,t.comprador_dni,p.estado AS pagoEstado FROM tickets t LEFT JOIN participantes p ON p.id=t.participante_id WHERE t.codigo=?",
      )
      .bind(codigo)
      .first<{
        ticket: string;
        tipo: string;
        ticketEstado: string;
        nombre: string;
        dni: string | null;
        comprador_dni: string | null;
        pagoEstado: string | null;
      }>();
    if (!row) return Response.json({ encontrado: false });
    const expected = (row.dni || row.comprador_dni || "").slice(-4);
    if (expected && identidad !== expected)
      return Response.json({
        encontrado: false,
        message: "El código o los últimos 4 dígitos del DNI no coinciden.",
      });
    const partes = row.nombre.trim().split(/\s+/),
      nombreSeguro = `${partes[0]}${partes[1] ? ` ${partes[1][0]}.` : ""}`,
      raw = row.tipo === "fisico" ? row.ticketEstado : row.pagoEstado,
      estados: Record<string, string> = {
        pendiente: "pendiente de revisión",
        aprobado: "pago confirmado",
        rechazado: "ANULADO",
        disponible: "disponible",
        vendido: "vendido y habilitado",
        anulado: "ANULADO",
      };
    return Response.json({
      encontrado: true,
      ticket: row.ticket,
      nombre: nombreSeguro,
      estado: estados[raw || ""] || raw,
    });
  } catch {
    return Response.json({ encontrado: false }, { status: 500 });
  }
}
