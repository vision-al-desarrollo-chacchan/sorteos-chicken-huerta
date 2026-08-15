import { clearSessionCookie } from "../../../admin-auth";
export async function POST() {
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": clearSessionCookie } },
  );
}
