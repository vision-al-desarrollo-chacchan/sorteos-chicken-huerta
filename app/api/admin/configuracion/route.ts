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
      "CREATE TABLE IF NOT EXISTS configuracion(clave TEXT PRIMARY KEY,valor TEXT NOT NULL,actualizado TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS auditoria(id INTEGER PRIMARY KEY AUTOINCREMENT,accion TEXT NOT NULL,detalle TEXT NOT NULL,administrador TEXT NOT NULL,creado TEXT NOT NULL)",
    ),
  ]);
}
export async function GET(r: Request) {
  const { DB } = await envs();
  if (!(await isAdmin(r))) return Response.json({ ok: false }, { status: 401 });
  await setup(DB);
  const rows = await DB.prepare("SELECT clave,valor FROM configuracion").all<{
      clave: string;
      valor: string;
    }>(),
    d = Object.fromEntries(rows.results.map((x) => [x.clave, x.valor]));
  return Response.json({
    ok: true,
    inicio: d.inicio_sorteo || "",
    fin: d.fin_sorteo || "",
    yape: d.yape_numero || "",
    titular: d.yape_titular || "",
    precio: Number(d.precio_ticket || 5),
    premio1: d.premio_1 || "Rezzio Kratos Pro 4.0",
    premio2: d.premio_2 || "Tekken 250 Pro",
    imagen1: d.imagen_1 || "/kratos-pro.png",
    imagen2: d.imagen_2 || "/tekken-250-pro.png",
    condiciones: d.condiciones || "Cada ticket aprobado participa por ambos premios.",
  });
}
export async function PUT(r: Request) {
  const { DB } = await envs();
  if (!(await isAdmin(r))) return Response.json({ ok: false }, { status: 401 });
  const { inicio, fin, yape, titular, precio, premio1, premio2, imagen1, imagen2, condiciones } = (await r.json()) as {
    inicio?: string;
    fin?: string;
    yape?: string;
    titular?: string;
    precio?: number; premio1?: string; premio2?: string; imagen1?: string; imagen2?: string; condiciones?: string;
  };
  if (
    !inicio ||
    !fin ||
    Date.parse(fin) <= Date.parse(inicio) ||
    !/^9\d{8}$/.test(yape || "") ||
    (titular || "").trim().length < 3 || !Number.isInteger(precio) || precio! < 1 || precio! > 1000 ||
    (premio1 || "").trim().length < 3 || (premio2 || "").trim().length < 3 ||
    (condiciones || "").trim().length < 10
  )
    return Response.json(
      { ok: false, message: "Revisa las fechas y los datos de Yape." },
      { status: 400 },
    );
  await setup(DB);
  const now = new Date().toISOString(),
    values = [
      ["inicio_sorteo", inicio],
      ["fin_sorteo", fin],
      ["yape_numero", yape!],
      ["yape_titular", titular!.trim()],
      ["precio_ticket", String(precio)],
      ["premio_1", premio1!.trim()],
      ["premio_2", premio2!.trim()],
      ["imagen_1", (imagen1 || "/kratos-pro.png").trim()],
      ["imagen_2", (imagen2 || "/tekken-250-pro.png").trim()],
      ["condiciones", condiciones!.trim()],
    ];
  await DB.batch([
    ...values.map(([k, v]) =>
      DB.prepare(
        "INSERT INTO configuracion(clave,valor,actualizado) VALUES(?,?,?) ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor,actualizado=excluded.actualizado",
      ).bind(k, v, now),
    ),
    DB.prepare(
      "INSERT INTO auditoria(accion,detalle,administrador,creado) VALUES('CONFIGURACION',?,?,?)",
    ).bind(`Fechas ${inicio} a ${fin}; Yape ${yape}`, email(), now),
  ]);
  return Response.json({ ok: true });
}
