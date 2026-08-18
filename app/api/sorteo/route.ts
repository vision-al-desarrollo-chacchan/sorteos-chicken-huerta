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
  const metodosPago = [
    { id: "yape", nombre: "Yape", activo: d.yape_activo !== "false", numero: d.yape_numero || "", titular: d.yape_titular || "", maximo: Number(d.yape_maximo || 500), qr: d.yape_qr || "/yape-chicken-huerta.jpg" },
    { id: "plin", nombre: "Plin", activo: d.plin_activo === "true", numero: d.plin_numero || "", titular: d.plin_titular || "", maximo: Number(d.plin_maximo || 500), qr: d.plin_qr || "" },
  ].filter((m) => m.activo && m.numero && m.qr);
  const premio2 = !d.premio_2 || (d.premio_2 === "Tekken 250 Pro" || d.premio_2 === "Tekken Rezzio 300") ? "Tekken 300" : d.premio_2;
  const imagen2 = !d.imagen_2 || d.imagen_2 === "/tekken-250-pro.png" ? "/tekken-rezzio-300.png" : d.imagen_2;
  return Response.json({ inicio, fin, estado, yape: d.yape_numero || null, titular: d.yape_titular || null, metodosPago, precio: Number(d.precio_ticket || 5), premio1: d.premio_1 || "Rezzio Kratos Pro 4.0", premio2, imagen1: d.imagen_1 || "/kratos-pro.png", imagen2, condiciones: d.condiciones || "Cada ticket aprobado participa por ambos premios.", ganadores }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
}
