async function settings() {
  const { env: values } = await import("cloudflare:workers");
  if (!values.SUPABASE_URL || !values.SUPABASE_SECRET_KEY) {
    throw new Error("Supabase no está configurado en el Worker.");
  }
  return { url: values.SUPABASE_URL, key: values.SUPABASE_SECRET_KEY };
}

export async function supabase<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, key } = await settings();
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      ...(init.body && !(init.body instanceof FormData) ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const details = (await response.text()).slice(0, 500);
    console.error("Supabase request failed", { status: response.status, path, details });
    throw new Error(`Supabase respondió ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function rest<T>(table: string, query = "", init: RequestInit = {}) {
  return supabase<T>(`/rest/v1/${table}${query ? `?${query}` : ""}`, init);
}

export function rpc<T>(name: string, body: Record<string, unknown>) {
  return supabase<T>(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(body) });
}

export function uploadReceipt(path: string, file: File) {
  return supabase(`/storage/v1/object/comprobantes/${path}`, {
    method: "POST",
    headers: { "content-type": file.type, "x-upsert": "false" },
    body: file,
  });
}

export function deleteReceipt(path: string) {
  return supabase("/storage/v1/object/comprobantes", {
    method: "DELETE",
    body: JSON.stringify({ prefixes: [path] }),
  });
}

export async function downloadReceipt(path: string) {
  const { url, key } = await settings();
  return fetch(`${url}/storage/v1/object/authenticated/comprobantes/${path}`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
}
