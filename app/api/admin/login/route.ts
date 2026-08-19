import { sessionCookie, verifyCredentials } from "../../../admin-auth";
import { rest } from "@/lib/supabase-server";

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function visitorId(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") || "desconocido";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return `login-${toHex(digest).slice(0, 24)}`;
}

export async function POST(request: Request) {
  let stage = "inicio";
  try {
    stage = "leer protección";
    const visitor = await visitorId(request);
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const failures = await rest<Array<{ creado: string }>>(
      "auditoria",
      `select=creado&accion=eq.LOGIN_FALLIDO&administrador=eq.${encodeURIComponent(visitor)}&creado=gte.${encodeURIComponent(since)}&order=creado.desc&limit=5`,
    );
    if (failures.length >= 5) {
      return Response.json(
        { ok: false, message: "Demasiados intentos. Espera 15 minutos antes de volver a intentar." },
        { status: 429 },
      );
    }

    stage = "leer credenciales";
    const { usuario, clave } = (await request.json()) as {
      usuario?: string;
      clave?: string;
    };

    stage = "verificar credenciales";
    if (!usuario || !clave || !(await verifyCredentials(usuario, clave))) {
      stage = "registrar intento";
      await rest("auditoria", "", {
        method: "POST",
        body: JSON.stringify({
          accion: "LOGIN_FALLIDO",
          detalle: "Intento de acceso rechazado",
          administrador: visitor,
          creado: new Date().toISOString(),
        }),
      });
      return Response.json(
        {
          ok: false,
          message: `Usuario o contraseña incorrectos. Quedan ${Math.max(0, 4 - failures.length)} intentos.`,
        },
        { status: 401 },
      );
    }

    stage = "crear sesión";
    return Response.json(
      { ok: true },
      { headers: { "Set-Cookie": await sessionCookie() } },
    );
  } catch (error) {
    console.error("Admin login failed", {
      stage,
      message: error instanceof Error ? error.message : "Error desconocido",
    });
    return Response.json(
      { ok: false, message: `No se pudo iniciar sesión (etapa: ${stage}).` },
      { status: 500 },
    );
  }
}
