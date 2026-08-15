"use client";
import { FormEvent, useEffect, useState } from "react";
export default function Config() {
  const [inicio, setInicio] = useState(""),
    [fin, setFin] = useState(""),
    [yape, setYape] = useState(""),
    [titular, setTitular] = useState("Elvis Esteban Infantes Huerta"),
    [precio, setPrecio] = useState(5),
    [premio1, setPremio1] = useState("Rezzio Kratos Pro 4.0"),
    [premio2, setPremio2] = useState("Tekken 250 Pro"),
    [imagen1, setImagen1] = useState("/kratos-pro.png"),
    [imagen2, setImagen2] = useState("/tekken-250-pro.png"),
    [condiciones, setCondiciones] = useState("Cada ticket aprobado participa por ambos premios."),
    [msg, setMsg] = useState(""),
    [claveMsg, setClaveMsg] = useState("");
  useEffect(() => {
    fetch("/api/admin/configuracion")
      .then((r) => r.json())
      .then((d) => {
        setInicio(d.inicio || "");
        setFin(d.fin || "");
        setYape(d.yape || "");
        setTitular(d.titular || "");
        setPrecio(d.precio || 5); setPremio1(d.premio1 || ""); setPremio2(d.premio2 || "");
        setImagen1(d.imagen1 || "/kratos-pro.png"); setImagen2(d.imagen2 || "/tekken-250-pro.png");
        setCondiciones(d.condiciones || "");
      })
      .catch(() => {});
  }, []);
  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    const r = await fetch("/api/admin/configuracion", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inicio, fin, yape, titular, precio, premio1, premio2, imagen1, imagen2, condiciones }),
      }),
      d = await r.json();
    setMsg(
      r.ok
        ? "Configuración actualizada y publicada."
        : d.message || "No se pudo guardar.",
    );
  }
  async function cambiarClave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setClaveMsg("");
    const f = new FormData(e.currentTarget),
      r = await fetch("/api/admin/cambiar-clave", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actual: f.get("actual"),
          nueva: f.get("nueva"),
          confirmacion: f.get("confirmacion"),
        }),
      }),
      d = await r.json();
    setClaveMsg(d.message || "No se pudo cambiar la contraseña.");
    if (r.ok) e.currentTarget.reset();
  }
  return (
    <main className="admin">
      <header className="adminHead">
        <div>
          <p className="eyebrow">CHICKEN HUERTA</p>
          <h1>Configuración del sorteo</h1>
          <p>Controla fechas, precio, premios, imágenes y condiciones.</p>
        </div>
        <a href="/admin">Volver al panel</a>
      </header>
      <form onSubmit={save}>
        <div className="configGrid">
        <label>Precio por ticket (S/)<input type="number" min={1} max={1000} value={precio} onChange={(e) => setPrecio(Number(e.target.value))} required /></label>
        <label>Primer premio<input value={premio1} onChange={(e) => setPremio1(e.target.value)} minLength={3} required /></label>
        <label>Imagen del primer premio<input value={imagen1} onChange={(e) => setImagen1(e.target.value)} placeholder="/kratos-pro.png o URL https://..." required /></label>
        <label>Segundo premio<input value={premio2} onChange={(e) => setPremio2(e.target.value)} minLength={3} required /></label>
        <label>Imagen del segundo premio<input value={imagen2} onChange={(e) => setImagen2(e.target.value)} placeholder="/tekken-250-pro.png o URL https://..." required /></label>
        <label className="wideField">Condiciones visibles<textarea value={condiciones} onChange={(e) => setCondiciones(e.target.value)} minLength={10} maxLength={500} rows={4} required /></label>
        </div>
        <label>
          Fecha y hora de inicio
          <input
            type="datetime-local"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            required
          />
        </label>
        <label>
          Fecha y hora de finalización
          <input
            type="datetime-local"
            value={fin}
            onChange={(e) => setFin(e.target.value)}
            min={inicio}
            required
          />
        </label>
        <label>
          Número oficial de Yape
          <input
            value={yape}
            onChange={(e) =>
              setYape(e.target.value.replace(/\D/g, "").slice(0, 9))
            }
            inputMode="numeric"
            pattern="9[0-9]{8}"
            placeholder="9 dígitos"
            required
          />
        </label>
        <label>
          Titular de Yape
          <input
            value={titular}
            onChange={(e) => setTitular(e.target.value)}
            minLength={3}
            maxLength={100}
            required
          />
        </label>
        <button className="primary">Guardar y publicar</button>
        {msg && (
          <p className={msg.startsWith("Configuración") ? "success" : "error"}>
            {msg}
          </p>
        )}
      </form>
      <section className="passwordPanel">
        <div>
          <p className="eyebrow">SEGURIDAD</p>
          <h2>Cambiar contraseña</h2>
          <p>
            Solo existe una cuenta administradora. La contraseña anterior dejará
            de funcionar inmediatamente.
          </p>
        </div>
        <form onSubmit={cambiarClave}>
          <label>
            Contraseña actual
            <input
              name="actual"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            Nueva contraseña
            <input
              name="nueva"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
            <small>
              Mínimo 12 caracteres con mayúscula, minúscula, número y símbolo.
            </small>
          </label>
          <label>
            Confirmar nueva contraseña
            <input
              name="confirmacion"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
          </label>
          <button className="primary">Cambiar contraseña</button>
          {claveMsg && (
            <p
              className={
                claveMsg.startsWith("Contraseña cambiada") ? "success" : "error"
              }
            >
              {claveMsg}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
