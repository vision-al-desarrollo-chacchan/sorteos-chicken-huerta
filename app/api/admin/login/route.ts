import { sessionCookie, verifyCredentials } from "../../../admin-auth";
export async function POST(request: Request) {
  const { env } = await import("cloudflare:workers");
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_login_attempts(clave TEXT PRIMARY KEY,intentos INTEGER NOT NULL DEFAULT 0,bloqueado_hasta INTEGER NOT NULL DEFAULT 0,actualizado TEXT NOT NULL)").run();
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconocido";
  const attempt = await env.DB.prepare("SELECT intentos,bloqueado_hasta AS bloqueadoHasta FROM admin_login_attempts WHERE clave=?").bind(ip).first<{ intentos: number; bloqueadoHasta: number }>();
  if ((attempt?.bloqueadoHasta || 0) > Date.now())
    return Response.json({ ok: false, message: "Demasiados intentos. Espera 15 minutos antes de volver a intentar." }, { status: 429 });
  const { usuario, clave } = (await request.json()) as {
    usuario?: string;
    clave?: string;
  };
  if (!usuario || !clave || !(await verifyCredentials(usuario, clave))) {
    const intentos = (attempt?.intentos || 0) + 1, bloqueado = intentos >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
    await env.DB.prepare("INSERT INTO admin_login_attempts(clave,intentos,bloqueado_hasta,actualizado) VALUES(?,?,?,?) ON CONFLICT(clave) DO UPDATE SET intentos=excluded.intentos,bloqueado_hasta=excluded.bloqueado_hasta,actualizado=excluded.actualizado").bind(ip, bloqueado ? 0 : intentos, bloqueado, new Date().toISOString()).run();
    return Response.json(
      { ok: false, message: bloqueado ? "Acceso bloqueado durante 15 minutos por seguridad." : `Usuario o contraseña incorrectos. Quedan ${5 - intentos} intentos.` },
      { status: bloqueado ? 429 : 401 },
    );
  }
  await env.DB.prepare("DELETE FROM admin_login_attempts WHERE clave=?").bind(ip).run();
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": await sessionCookie() } },
  );
}
