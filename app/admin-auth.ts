import { rest } from "@/lib/supabase-server";

const encoder = new TextEncoder();
function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
async function signature(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToHex(
    await crypto.subtle.sign("HMAC", key, encoder.encode(value)),
  );
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function envs() {
  const { env } = await import("cloudflare:workers");
  return env as typeof env & {
    ADMIN_USER?: string;
    ADMIN_PASSWORD?: string;
    ADMIN_SESSION_SECRET?: string;
  };
}
async function storedCredential() {
  const rows = await rest<Array<{ clave: string; valor: string }>>("configuracion", "select=clave,valor&clave=in.(admin_password_hash,admin_password_version)");
  const d = Object.fromEntries(rows.map((x) => [x.clave, x.valor]));
  return {
    hash: d.admin_password_hash || "",
    version: d.admin_password_version || "env",
  };
}
async function passwordHash(password: string, salt: string) {
  return bytesToHex(
    await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(`${salt}:${password}`),
    ),
  );
}
export async function isAdmin(request: Request) {
  const { ADMIN_SESSION_SECRET } = await envs();
  if (!ADMIN_SESSION_SECRET) return false;
  const raw = request.headers
    .get("cookie")
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("ch_admin="))
    ?.slice(9);
  if (!raw) return false;
  const [payload, sig] = raw.split(".");
  if (
    !payload ||
    !sig ||
    !safeEqual(await signature(payload, ADMIN_SESSION_SECRET), sig)
  )
    return false;
  const [expiresText, version] = payload.split(":");
  const expires = Number(expiresText),
    current = await storedCredential();
  return (
    Number.isFinite(expires) &&
    expires > Date.now() &&
    version === current.version
  );
}
export async function verifyCredentials(user: string, password: string) {
  const { ADMIN_USER, ADMIN_PASSWORD } = await envs();
  if (!safeEqual(user, ADMIN_USER || "administrador")) return false;
  const stored = await storedCredential();
  if (stored.hash) {
    const [salt, hash] = stored.hash.split(":");
    if (
      salt &&
      hash &&
      safeEqual(await passwordHash(password, salt), hash)
    )
      return true;
  }
  return Boolean(ADMIN_PASSWORD && safeEqual(password, ADMIN_PASSWORD));
}
export async function changePassword(current: string, next: string) {
  if (!(await verifyCredentials("administrador", current)))
    return { ok: false, message: "La contraseña actual es incorrecta." };
  if (
    next.length < 12 ||
    !/[A-Z]/.test(next) ||
    !/[a-z]/.test(next) ||
    !/[0-9]/.test(next) ||
    !/[!@#$%&*._-]/.test(next)
  )
    return {
      ok: false,
      message:
        "La nueva contraseña debe tener 12 caracteres, mayúscula, minúscula, número y símbolo.",
    };
  const salt = crypto.randomUUID().replaceAll("-", ""),
    hash = await passwordHash(next, salt),
    version = crypto.randomUUID(),
    now = new Date().toISOString();
  await rest("configuracion", "on_conflict=clave", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify([
    { clave: "admin_password_hash", valor: `${salt}:${hash}`, actualizado: now },
    { clave: "admin_password_version", valor: version, actualizado: now },
  ]) });
  return { ok: true };
}
export async function sessionCookie() {
  const { ADMIN_SESSION_SECRET } = await envs();
  if (!ADMIN_SESSION_SECRET) throw new Error("Sesión no configurada");
  const credential = await storedCredential(),
    expires = `${Date.now() + 8 * 60 * 60 * 1000}:${credential.version}`,
    sig = await signature(expires, ADMIN_SESSION_SECRET);
  return `ch_admin=${expires}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`;
}
export const clearSessionCookie =
  "ch_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
