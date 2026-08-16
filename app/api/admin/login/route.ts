import { sessionCookie, verifyCredentials } from "../../../admin-auth";
import { rest } from "@/lib/supabase-server";
export async function POST(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconocido";
  const attempts = await rest<Array<{ intentos: number; bloqueado_hasta: number }>>("admin_login_attempts", `select=intentos,bloqueado_hasta&clave=eq.${encodeURIComponent(ip)}&limit=1`);
  const attempt = attempts[0];
  if ((attempt?.bloqueado_hasta || 0) > Date.now())
    return Response.json({ ok: false, message: "Demasiados intentos. Espera 15 minutos antes de volver a intentar." }, { status: 429 });
  const { usuario, clave } = (await request.json()) as {
    usuario?: string;
    clave?: string;
  };
  if (!usuario || !clave || !(await verifyCredentials(usuario, clave))) {
    const intentos = (attempt?.intentos || 0) + 1, bloqueado = intentos >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
    await rest("admin_login_attempts", "on_conflict=clave", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ clave: ip, intentos: bloqueado ? 0 : intentos, bloqueado_hasta: bloqueado, actualizado: new Date().toISOString() }) });
    return Response.json(
      { ok: false, message: bloqueado ? "Acceso bloqueado durante 15 minutos por seguridad." : `Usuario o contraseña incorrectos. Quedan ${5 - intentos} intentos.` },
      { status: bloqueado ? 429 : 401 },
    );
  }
  await rest("admin_login_attempts", `clave=eq.${encodeURIComponent(ip)}`, { method: "DELETE" });
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": await sessionCookie() } },
  );
}
