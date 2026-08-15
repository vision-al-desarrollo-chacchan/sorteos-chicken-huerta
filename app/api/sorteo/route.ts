async function db() {
  const { env } = await import("cloudflare:workers");
  return env.DB as D1Database;
}
async function setup(DB: D1Database) {
  await DB.batch([
    DB.prepare(
      "CREATE TABLE IF NOT EXISTS configuracion(clave TEXT PRIMARY KEY,valor TEXT NOT NULL,actualizado TEXT NOT NULL)",
    ),
    DB.prepare(
      "CREATE TABLE IF NOT EXISTS ganadores(id INTEGER PRIMARY KEY AUTOINCREMENT,premio INTEGER NOT NULL UNIQUE,ticket_id INTEGER NOT NULL UNIQUE,codigo TEXT NOT NULL,participante_id INTEGER NOT NULL,nombre TEXT NOT NULL,dni TEXT NOT NULL,creado TEXT NOT NULL)",
    ),
  ]);
}
function horaPeru(value: string | null) {
  if (!value) return null;
  return /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}:00-05:00`;
}
export async function GET() {
  const DB = await db();
  await setup(DB);
  const rows = await DB.prepare("SELECT clave,valor FROM configuracion").all<{
      clave: string;
      valor: string;
    }>(),
    ganadores = await DB.prepare(
      "SELECT premio,codigo,nombre,creado FROM ganadores ORDER BY premio",
    ).all(),
    d = Object.fromEntries(rows.results.map((x) => [x.clave, x.valor])),
    now = Date.now(),
    inicio = horaPeru(d.inicio_sorteo || null),
    fin = horaPeru(d.fin_sorteo || null),
    estado =
      !inicio || !fin
        ? "por_anunciar"
        : now < Date.parse(inicio)
          ? "proximamente"
          : now > Date.parse(fin)
            ? "finalizado"
            : "vigente";
  return Response.json(
    {
      inicio,
      fin,
      estado,
      yape: d.yape_numero || null,
      titular: d.yape_titular || null,
      precio: Number(d.precio_ticket || 5),
      premio1: d.premio_1 || "Rezzio Kratos Pro 4.0",
      premio2: d.premio_2 || "Tekken 250 Pro",
      imagen1: d.imagen_1 || "/kratos-pro.png",
      imagen2: d.imagen_2 || "/tekken-250-pro.png",
      condiciones: d.condiciones || "Cada ticket aprobado participa por ambos premios.",
      ganadores: ganadores.results,
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
  );
}
