import { isAdmin } from "../../admin-auth";
async function resources() {
  const { env } = await import("cloudflare:workers");
  return env as typeof env & { BUCKET: R2Bucket };
}
export async function GET(request: Request) {
  const { BUCKET } = await resources();
  if (!(await isAdmin(request)))
    return new Response("No autorizado", { status: 401 });
  const key = new URL(request.url).searchParams.get("key");
  if (!key || !key.startsWith("comprobantes/"))
    return new Response("Solicitud inválida", { status: 400 });
  const object = await BUCKET.get(key);
  if (!object) return new Response("No encontrado", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}
