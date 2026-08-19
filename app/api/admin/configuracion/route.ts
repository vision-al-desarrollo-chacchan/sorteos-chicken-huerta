import { isAdmin } from "../../../admin-auth";
import { rest } from "@/lib/supabase-server";
function email() {
  return "administrador";
}
export async function GET(r: Request) {
  if (!(await isAdmin(r))) return Response.json({ ok: false }, { status: 401 });
  const rows = await rest<Array<{ clave: string; valor: string }>>("configuracion", "select=clave,valor"),
    d = Object.fromEntries(rows.map((x) => [x.clave, x.valor]));
  return Response.json({
    ok: true,
    inicio: d.inicio_sorteo || "",
    fin: d.fin_sorteo || "",
    yape: !d.yape_numero || d.yape_numero === "961745846" ? "932476860" : d.yape_numero,
    titular: d.yape_titular || "",
    yapeActivo: d.yape_activo !== "false",
    yapeMaximo: Number(d.yape_maximo || 500),
    yapeQr: d.yape_qr || "/yape-chicken-huerta.jpg",
    plin: d.plin_numero || "",
    plinTitular: d.plin_titular || "",
    plinActivo: d.plin_activo === "true",
    plinMaximo: Number(d.plin_maximo || 500),
    plinQr: d.plin_qr || "",
    precio: Number(d.precio_ticket || 5),
    premio1: d.premio_1 || "Rezzio Kratos Pro 4.0",
    premio2: !d.premio_2 || (d.premio_2 === "Tekken 250 Pro" || d.premio_2 === "Tekken Rezzio 300") ? "Tekken 300" : d.premio_2,
    imagen1: d.imagen_1 || "/kratos-pro.png",
    imagen2: !d.imagen_2 || d.imagen_2 === "/tekken-250-pro.png" ? "/tekken-rezzio-300.png" : d.imagen_2,
    condiciones: d.condiciones || "Cada ticket aprobado participa por ambos premios.",
  });
}
export async function PUT(r: Request) {
  if (!(await isAdmin(r))) return Response.json({ ok: false }, { status: 401 });
  const { inicio, fin, yape, titular, yapeActivo, yapeMaximo, yapeQr, plin, plinTitular, plinActivo, plinMaximo, plinQr, precio, premio1, premio2, imagen1, imagen2, condiciones } = (await r.json()) as {
    inicio?: string;
    fin?: string;
    yape?: string;
    titular?: string;
    yapeActivo?: boolean; yapeMaximo?: number; yapeQr?: string;
    plin?: string; plinTitular?: string; plinActivo?: boolean; plinMaximo?: number; plinQr?: string;
    precio?: number; premio1?: string; premio2?: string; imagen1?: string; imagen2?: string; condiciones?: string;
  };
  if (
    !inicio ||
    !fin ||
    Date.parse(fin) <= Date.parse(inicio) ||
    (!yapeActivo && !plinActivo) ||
    (yapeActivo && (!/^9\d{8}$/.test(yape || "") || (titular || "").trim().length < 3 || !Number.isFinite(yapeMaximo) || yapeMaximo! < 1 || !(yapeQr || "").trim())) ||
    (plinActivo && (!/^9\d{8}$/.test(plin || "") || (plinTitular || "").trim().length < 3 || !Number.isFinite(plinMaximo) || plinMaximo! < 1 || !(plinQr || "").trim())) ||
    !Number.isInteger(precio) || precio! < 1 || precio! > 1000 ||
    (premio1 || "").trim().length < 3 || (premio2 || "").trim().length < 3 ||
    (condiciones || "").trim().length < 10
  )
    return Response.json(
      { ok: false, message: "Revisa las fechas y la configuración de Yape o Plin. Debe quedar al menos un método activo." },
      { status: 400 },
    );
  const now = new Date().toISOString(),
    values = [
      ["inicio_sorteo", inicio],
      ["fin_sorteo", fin],
      ["yape_numero", yape!],
      ["yape_titular", titular!.trim()],
      ["yape_activo", String(Boolean(yapeActivo))],
      ["yape_maximo", String(yapeMaximo || 0)],
      ["yape_qr", (yapeQr || "").trim()],
      ["plin_numero", (plin || "").trim()],
      ["plin_titular", (plinTitular || "").trim()],
      ["plin_activo", String(Boolean(plinActivo))],
      ["plin_maximo", String(plinMaximo || 0)],
      ["plin_qr", (plinQr || "").trim()],
      ["precio_ticket", String(precio)],
      ["premio_1", premio1!.trim()],
      ["premio_2", premio2!.trim()],
      ["imagen_1", (imagen1 || "/kratos-pro.png").trim()],
      ["imagen_2", (imagen2 || "/tekken-rezzio-300.png").trim()],
      ["condiciones", condiciones!.trim()],
    ];
  await rest("configuracion", "on_conflict=clave", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(values.map(([clave, valor]) => ({ clave, valor, actualizado: now }))) });
  await rest("auditoria", "", { method: "POST", body: JSON.stringify({ accion: "CONFIGURACION", detalle: `Fechas ${inicio} a ${fin}; pagos: ${yapeActivo ? "Yape" : ""}${yapeActivo && plinActivo ? " y " : ""}${plinActivo ? "Plin" : ""}`, administrador: email(), creado: now }) });
  return Response.json({ ok: true });
}
