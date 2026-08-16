import { isAdmin } from "../../admin-auth";
import { downloadReceipt } from "@/lib/supabase-server";

export async function GET(request: Request) {
  if (!(await isAdmin(request))) return new Response("No autorizado", { status: 401 });
  const key = new URL(request.url).searchParams.get("key");
  if (!key || key.includes("..") || !/^[a-zA-Z0-9_./-]+$/.test(key)) return new Response("Solicitud inválida", { status: 400 });
  const object = await downloadReceipt(key);
  if (!object.ok || !object.body) return new Response("No encontrado", { status: 404 });
  const headers = new Headers({ "content-type": object.headers.get("content-type") || "application/octet-stream", "cache-control": "private, no-store", "x-content-type-options": "nosniff" });
  return new Response(object.body, { headers });
}
