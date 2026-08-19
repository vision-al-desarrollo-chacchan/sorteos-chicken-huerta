import { isAdmin } from "../../../admin-auth";
import { rest } from "@/lib/supabase-server";

function email() {
  return "administrador";
}

export async function GET(r: Request) {
  if (!(await isAdmin(r))) return Response.json({ ok: false }, { status: 401 });
  const rows = await rest<Array<{ clave: string; valor: string }>>("configuracion", "select=clave,valor");
  const d = Object.fromEntries(rows.map((x) => [x.clave, x.valor]));
  return Response.json({
    ok: true,
    inicio: d.inicio_sorteo || "",
    fin: d.fin_sorteo || "",
    precio: Number(d.precio_ticket || 5),
    premio1: d.premio_1 || "Rezzio Kratos Pro 4.0",
    premio2: !d.premio_2 || d.premio_2 === "Tekken 250 Pro" || d.premio_2 === "Tekken Rezzio 300" ? "Tekken 300" : d.premio_2,
    imagen1: d.imagen_1 || "/kratos-pro.png",
    imagen2: !d.imagen_2 || d.imagen_2 === "/tekken-250-pro.png" ? "/tekken-rezzio-300.png" : d.imagen_2,
    condiciones: d.condiciones || "Cada ticket aprobado participa por ambos premios.",
  });
}

export async function PUT(r: Request) {
  if (!(await isAdmin(r))) return Response.json({ ok: false }, { status: 401 });
  const { inicio, fin, precio, premio1, premio2, imagen1, imagen2, condiciones } = (await r.json()) as {
    inicio?: string;
    fin?: string;
    precio?: number;
    premio1?: string;
    premio2?: string;
    imagen1?: string;
    imagen2?: string;
    condiciones?: string;
  };

  if (
    !inicio ||
    !fin ||
    Date.parse(fin) <= Date.parse(inicio) ||
    !Number.isInteger(precio) ||
    precio! < 1 ||
    precio! > 1000 ||
    (premio1 || "").trim().length < 3 ||
    (premio2 || "").trim().length < 3 ||
    (condiciones || "").trim().length < 10
  ) {
    return Response.json(
      { ok: false, message: "Revisa las fechas, el precio y los premios." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const values = [
    ["inicio_sorteo", inicio],
    ["fin_sorteo", fin],
    ["precio_ticket", String(precio)],
    ["premio_1", premio1!.trim()],
    ["premio_2", premio2!.trim()],
    ["imagen_1", (imagen1 || "/kratos-pro.png").trim()],
    ["imagen_2", (imagen2 || "/tekken-rezzio-300.png").trim()],
    ["condiciones", condiciones!.trim()],
  ];

  await rest("configuracion", "on_conflict=clave", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify(values.map(([clave, valor]) => ({ clave, valor, actualizado: now }))),
  });
  await rest("auditoria", "", {
    method: "POST",
    body: JSON.stringify({
      accion: "CONFIGURACION",
      detalle: `Fechas ${inicio} a ${fin}; premios actualizados`,
      administrador: email(),
      creado: now,
    }),
  });
  return Response.json({ ok: true });
}
