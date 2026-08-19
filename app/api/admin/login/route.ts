import { sessionCookie, verifyCredentials } from "../../../admin-auth";
import { rest } from "@/lib/supabase-server";

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function attemptKey(request: Request) {
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "desconocido";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return `admin_login_attempt_${toHex(digest).slice(0, 32)}`;
}

type Attempt = { intentos: number; bloqueado_hasta: number };

export async function POST(request: Request) {
  const key = await attemptKey(request);
  const rows = await rest<Array<{ valor: string }>>(
    "configuracion",
    `select=valor&clave=eq.${encodeURIComponent(key)}&limit=1`,
  );
  let attempt: Attempt = { intentos: 0, bloqueado_hasta: 0 };
  if (rows[0]?.valor) {
    try {
      attempt = JSON.parse(rows[0].valor) as Attempt;
    } catch {
      attempt = { intentos: 0, bloqueado_hasta: 0 };
    }
  }

  if (attempt.bloqueado_hasta > Date.now()) {
    return Response.json(
      { ok: false, message: "Demasiados intentos. Espera 15 minutos antes de volver a intentar." },
      { status: 429 },
    );
  }

  const { usuario, clave } = (await request.json()) as {
    usuario?: string;
    clave?: string;
  };

  if (!usuario || !clave || !(await verifyCredentials(usuario, clave))) {
    const intentos = attempt.intentos + 1;
    const bloqueado = intentos >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
    await rest("configuracion", "on_conflict=clave", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        clave: key,
        valor: JSON.stringify({
          intentos: bloqueado ? 0 : intentos,
          bloqueado_hasta: bloqueado,
        }),
        actualizado: new Date().toISOString(),
      }),
    });
    return Response.json(
      {
        ok: false,
        message: bloqueado
          ? "Acceso bloqueado durante 15 minutos por seguridad."
          : `Usuario o contraseña incorrectos. Quedan ${5 - intentos} intentos.`,
      },
      { status: bloqueado ? 429 : 401 },
    );
  }

  await rest("configuracion", `clave=eq.${encodeURIComponent(key)}`, {
    method: "DELETE",
  });

  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": await sessionCookie() } },
  );
}
