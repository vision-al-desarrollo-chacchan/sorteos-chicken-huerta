"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
export default function Login() {
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const f = new FormData(e.currentTarget),
      r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          usuario: f.get("usuario"),
          clave: f.get("clave"),
        }),
      });
    if (r.ok) {
      location.href = "/admin";
      return;
    }
    const d = await r.json();
    setError(d.message || "No se pudo iniciar sesión");
    setLoading(false);
  }
  return (
    <main className="adminLogin">
      <section>
        <img src="/logo-chicken-huerta.jpg" alt="Chicken Huerta" />
        <p className="eyebrow">ACCESO PRIVADO</p>
        <h1>Panel del sorteo</h1>
        <p>Ingresa con el usuario y contraseña exclusivos del administrador.</p>
        <form onSubmit={submit}>
          <label>
            Usuario
            <input name="usuario" autoComplete="username" required />
          </label>
          <label>
            Contraseña
            <input
              name="clave"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="primary" disabled={loading}>
            {loading ? "Ingresando…" : "Ingresar al panel"}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
        <Link href="/">← Volver al sorteo</Link>
      </section>
    </main>
  );
}
