import { deleteReceipt, receiptExists, rest, rpc, uploadReceipt } from "@/lib/supabase-server";

function horaPeru(value: string) {
  return /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}:00-05:00`;
}

export async function POST(request: Request) {
  let receiptPath = "";
  try {
    const config = await rest<Array<{ clave: string; valor: string }>>("configuracion", "select=clave,valor&clave=in.(inicio_sorteo,fin_sorteo,precio_ticket,yape_activo,yape_maximo,plin_activo,plin_maximo)");
    const cfg = Object.fromEntries(config.map((row) => [row.clave, row.valor]));
    const now = Date.now();
    const precio = Math.max(1, Number(cfg.precio_ticket || 5));
    if (cfg.inicio_sorteo && now < Date.parse(horaPeru(cfg.inicio_sorteo))) return Response.json({ ok: false, message: "La venta todavía no ha comenzado." }, { status: 403 });
    if (cfg.fin_sorteo && now > Date.parse(horaPeru(cfg.fin_sorteo))) return Response.json({ ok: false, message: "La venta de tickets ya finalizó." }, { status: 403 });

    const form = await request.formData();
    const nombre = String(form.get("nombre") ?? "").trim().replace(/\s+/g, " ");
    const dni = String(form.get("dni") ?? "").trim();
    const celular = String(form.get("celular") ?? "").trim();
    const operacion = String(form.get("operacion") ?? "").trim();
    const cantidad = Number(form.get("cantidad"));
    const metodo = String(form.get("metodo") ?? "yape").toLowerCase();
    const comprobante = form.get("comprobante");
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    const total = cantidad * precio;
    const metodoValido = ["yape", "plin", "bcp", "interbank"].includes(metodo);
    const activo = metodo === "yape" ? cfg.yape_activo !== "false" : metodo === "plin" ? cfg.plin_activo === "true" : metodo === "bcp" || metodo === "interbank";
    const maximo = Number(metodo === "yape" ? cfg.yape_maximo || 500 : metodo === "plin" ? cfg.plin_maximo || 500 : 100000);
    if (nombre.length < 3 || nombre.length > 100) return Response.json({ ok: false, message: "Ingresa correctamente tu nombre y apellidos." }, { status: 400 });
    if (!/^\d{8}$/.test(dni)) return Response.json({ ok: false, message: "El DNI debe tener exactamente 8 números." }, { status: 400 });
    if (!/^9\d{8}$/.test(celular)) return Response.json({ ok: false, message: "El celular debe tener 9 números y comenzar en 9." }, { status: 400 });
    if (!/^[a-zA-Z0-9-]{4,40}$/.test(operacion)) return Response.json({ ok: false, message: "Ingresa el código de operación del pago, no tu nombre." }, { status: 400 });
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 100) return Response.json({ ok: false, message: "La cantidad de tickets no es válida." }, { status: 400 });
    if (!metodoValido || !activo || !Number.isFinite(maximo) || total > maximo) return Response.json({ ok: false, message: "El método o monto de pago seleccionado no está disponible." }, { status: 400 });
    if (!(comprobante instanceof File) || comprobante.size < 1 || comprobante.size > 5_000_000 || !allowed.includes(comprobante.type)) return Response.json({ ok: false, message: "Adjunta un comprobante JPG, PNG, WEBP o PDF de máximo 5 MB." }, { status: 400 });
    const operacionGuardada = `${metodo.toUpperCase()}-${operacion}`;
    const duplicate = await rest<Array<{ id: number }>>("participantes", `select=id&operacion=ilike.${encodeURIComponent(operacionGuardada)}&limit=1`);
    if (duplicate.length) return Response.json({ ok: false, message: "Este número de operación ya fue registrado." }, { status: 409 });

    const digest = await crypto.subtle.digest("SHA-256", await comprobante.arrayBuffer());
    const comprobanteHash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    receiptPath = `sha256/${comprobanteHash}`;
    if (await receiptExists(receiptPath))
      return Response.json(
        {
          ok: false,
          message:
            "Este comprobante ya fue utilizado. No puedes registrarlo nuevamente cambiando el número de operación.",
        },
        { status: 409 },
      );
    await uploadReceipt(receiptPath, comprobante);
    const result = await rpc<{ participante_id: number; tickets: string[] }>("registrar_participante", { p_nombre: nombre, p_dni: dni, p_celular: celular, p_operacion: operacionGuardada, p_cantidad: cantidad, p_monto: total, p_comprobante_key: receiptPath });
    return Response.json({ ok: true, tickets: result.tickets });
  } catch {
    if (receiptPath) try { await deleteReceipt(receiptPath); } catch { /* limpieza de mejor esfuerzo */ }
    return Response.json({ ok: false, message: "No pudimos completar el registro. Intenta nuevamente." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const dni = url.searchParams.get("dni")?.trim();
    if (!dni || !/^\d{8}$/.test(dni))
      return Response.json(
        { encontrado: false, message: "Ingresa un DNI válido de 8 dígitos." },
        { status: 400 },
      );
    const participantes = await rest<Array<{ id: number; nombre: string }>>(
      "participantes",
      `select=id,nombre&dni=eq.${encodeURIComponent(dni)}&order=id.asc`,
    );
    const ids = participantes.map((participante) => participante.id);
    const [digitales, fisicos] = await Promise.all([
      ids.length
        ? rest<Array<{ codigo: string; estado: string }>>(
            "tickets",
            `select=codigo,estado&participante_id=in.(${ids.join(",")})&order=id.asc`,
          )
        : Promise.resolve([]),
      rest<Array<{ codigo: string; estado: string; comprador_nombre: string | null }>>(
        "tickets",
        `select=codigo,estado,comprador_nombre&comprador_dni=eq.${encodeURIComponent(dni)}&order=id.asc`,
      ),
    ]);
    const tickets = Array.from(
      new Map([...digitales, ...fisicos].map((ticket) => [ticket.codigo, ticket])).values(),
    );
    if (!tickets.length)
      return Response.json({ encontrado: false, message: "No encontramos tickets registrados con ese DNI." });
    const nombre = participantes[0]?.nombre || fisicos[0]?.comprador_nombre || "Cliente";
    const partes = nombre.trim().split(/\s+/);
    const estados: Record<string, string> = { pendiente: "pendiente de revisión", aprobado: "pago confirmado", rechazado: "ANULADO", disponible: "disponible", vendido: "vendido y habilitado", anulado: "ANULADO" };
    return Response.json({
      encontrado: true,
      nombre: `${partes[0]}${partes[1] ? ` ${partes[1][0]}.` : ""}`,
      total: tickets.length,
      tickets: tickets.map((ticket) => ({ codigo: ticket.codigo, estado: estados[ticket.estado] || ticket.estado })),
    });
  } catch {
    return Response.json({ encontrado: false }, { status: 500 });
  }
}
