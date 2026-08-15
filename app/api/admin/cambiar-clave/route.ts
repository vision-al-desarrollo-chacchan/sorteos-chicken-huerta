import { changePassword, isAdmin, sessionCookie } from "../../../admin-auth";
export async function PUT(request: Request) {
  if (!(await isAdmin(request)))
    return Response.json(
      { ok: false, message: "Sesión no autorizada." },
      { status: 401 },
    );
  const { actual, nueva, confirmacion } = (await request.json()) as {
    actual?: string;
    nueva?: string;
    confirmacion?: string;
  };
  if (!actual || !nueva || nueva !== confirmacion)
    return Response.json(
      { ok: false, message: "Las contraseñas nuevas no coinciden." },
      { status: 400 },
    );
  const result = await changePassword(actual, nueva);
  if (!result.ok) return Response.json(result, { status: 400 });
  return Response.json(
    { ok: true, message: "Contraseña cambiada correctamente." },
    { headers: { "Set-Cookie": await sessionCookie() } },
  );
}
