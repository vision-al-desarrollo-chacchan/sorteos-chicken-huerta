import { rest } from "@/lib/supabase-server";

function horaPeru(value: string | null) {
  if (!value) return null;
  return /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}:00-05:00`;
}

export async function GET() {
  const [config, ganadores] = await Promise.all([
    rest<Array<{ clave: string; valor: string }>>("configuracion", "select=clave,valor"),
    rest<Array<{ premio: number; codigo: string; nombre: string; creado: string }>>("ganadores", "select=premio,codigo,nombre,creado&order=premio.asc"),
  ]);
  const d = Object.fromEntries(config.map((row) => [row.clave, row.valor]));
  const inicio = horaPeru(d.inicio_sorteo || null);
  const fin = horaPeru(d.fin_sorteo || null);
  const now = Date.now();
  const estado = !inicio || !fin ? "por_anunciar" : now < Date.parse(inicio) ? "proximamente" : now > Date.parse(fin) ? "finalizado" : "vigente";
  return Response.json({ inicio, fin, estado, yape: d.yape_numero || null, titular: d.yape_titular || null, precio: Number(d.precio_ticket || 5), premio1: d.premio_1 || "Rezzio Kratos Pro 4.0", premio2: d.premio_2 || "Tekken 250 Pro", imagen1: d.imagen_1 || "/kratos-pro.png", imagen2: d.imagen_2 || "/tekken-250-pro.png", condiciones: d.condiciones || "Cada ticket aprobado participa por ambos premios.", ganadores }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
}
