"use client";
import { FormEvent, useEffect, useState } from "react";
export default function Config() {
  const [inicio, setInicio] = useState(""),
    [fin, setFin] = useState(""),
    [yape, setYape] = useState("932476860"),
    [titular, setTitular] = useState("Elvis Esteban Infantes Huerta"),
    [yapeActivo, setYapeActivo] = useState(true),
    [yapeMaximo, setYapeMaximo] = useState(500),
    [yapeQr, setYapeQr] = useState("/yape-chicken-huerta.jpg"),
    [plin, setPlin] = useState(""),
    [plinTitular, setPlinTitular] = useState(""),
    [plinActivo, setPlinActivo] = useState(false),
    [plinMaximo, setPlinMaximo] = useState(500),
    [plinQr, setPlinQr] = useState(""),
    [precio, setPrecio] = useState(5),
    [premio1, setPremio1] = useState("Rezzio Kratos Pro 4.0"),
    [premio2, setPremio2] = useState("Tekken 300"),
    [imagen1, setImagen1] = useState("/kratos-pro.png"),
    [imagen2, setImagen2] = useState("/tekken-rezzio-300.png"),
    [condiciones, setCondiciones] = useState("Cada ticket aprobado participa por ambos premios."),
    [msg, setMsg] = useState(""),
    [claveMsg, setClaveMsg] = useState("");
  useEffect(() => {
    fetch("/api/admin/configuracion")
      .then((r) => r.json())
      .then((d) => {
        setInicio(d.inicio || "");
        setFin(d.fin || "");
        setYape(d.yape || "932476860");
        setTitular(d.titular || "");
        setYapeActivo(d.yapeActivo !== false); setYapeMaximo(d.yapeMaximo || 500); setYapeQr(d.yapeQr || "/yape-chicken-huerta.jpg");
        setPlin(d.plin || ""); setPlinTitular(d.plinTitular || ""); setPlinActivo(Boolean(d.plinActivo)); setPlinMaximo(d.plinMaximo || 500); setPlinQr(d.plinQr || "");
        setPrecio(d.precio || 5); setPremio1(d.premio1 || ""); setPremio2(d.premio2 || "");
        setImagen1(d.imagen1 || "/kratos-pro.png"); setImagen2(d.imagen2 || "/tekken-rezzio-300.png");
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
        body: JSON.stringify({ inicio, fin, yape, titular, yapeActivo, yapeMaximo, yapeQr, plin, plinTitular, plinActivo, plinMaximo, plinQr, precio, premio1, premio2, imagen1, imagen2, condiciones }),
      }),
      d = await r.json();
    setMsg(
      r.ok
        ? "Configuración actualizada y publicada."
        : d.message || "No se pudo guardar.",
    );
  }
  function cargarQr(file: File | undefined, setter: (value: string) => void) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 1_000_000) {
      setMsg("El QR debe ser una imagen JPG, PNG o WebP de máximo 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setter(String(reader.result || ""));
    reader.readAsDataURL(file);
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
          <p>Controla fechas, premios y los cobros por Yape o Plin.</p>
        </div>
        <a href="/admin">Volver al panel</a>
      </header>
      <form onSubmit={save}>
        <div className="configGrid">
        <label>Precio por ticket (S/)<input type="number" min={1} max={1000} value={precio} onChange={(e) => setPrecio(Number(e.target.value))} required /></label>
        <label>Primer premio<input value={premio1} onChange={(e) => setPremio1(e.target.value)} minLength={3} required /></label>
        <label>Imagen del primer premio<input value={imagen1} onChange={(e) => setImagen1(e.target.value)} placeholder="/kratos-pro.png o URL https://..." required /></label>
        <label>Segundo premio<input value={premio2} onChange={(e) => setPremio2(e.target.value)} minLength={3} required /></label>
        <label>Imagen del segundo premio<input value={imagen2} onChange={(e) => setImagen2(e.target.value)} placeholder="/tekken-rezzio-300.png o URL https://..." required /></label>
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
        <section className="paymentConfig">
          <div className="paymentConfigHead"><div><p className="eyebrow">MÉTODOS DE PAGO</p><h2>Yape</h2></div><label className="methodSwitch"><input type="checkbox" checked={yapeActivo} onChange={(e) => setYapeActivo(e.target.checked)} /> {yapeActivo ? "Activo" : "Desactivado"}</label></div>
          <div className="configGrid">
            <label>Número oficial de Yape<input value={yape} onChange={(e) => setYape(e.target.value.replace(/\D/g, "").slice(0, 9))} inputMode="numeric" pattern="9[0-9]{8}" placeholder="9 dígitos" required={yapeActivo} disabled={!yapeActivo} /></label>
            <label>Titular de Yape<input value={titular} onChange={(e) => setTitular(e.target.value)} minLength={3} maxLength={100} required={yapeActivo} disabled={!yapeActivo} /></label>
            <label>Monto máximo por compra (S/)<input type="number" min={1} step="0.01" value={yapeMaximo} onChange={(e) => setYapeMaximo(Number(e.target.value))} required={yapeActivo} disabled={!yapeActivo} /><small>Yape solo aparecerá si el total no supera este monto.</small></label>
            <label>Imagen QR de Yape<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => cargarQr(e.target.files?.[0], setYapeQr)} disabled={!yapeActivo} /></label>
          </div>
          {yapeQr && <img className="qrPreview" src={yapeQr} alt="Vista previa del QR de Yape" />}
        </section>
        <section className="paymentConfig plinConfig">
          <div className="paymentConfigHead"><div><p className="eyebrow">MÉTODOS DE PAGO</p><h2>Plin</h2></div><label className="methodSwitch"><input type="checkbox" checked={plinActivo} onChange={(e) => setPlinActivo(e.target.checked)} /> {plinActivo ? "Activo" : "Desactivado"}</label></div>
          <div className="configGrid">
            <label>Número oficial de Plin<input value={plin} onChange={(e) => setPlin(e.target.value.replace(/\D/g, "").slice(0, 9))} inputMode="numeric" pattern="9[0-9]{8}" placeholder="9 dígitos" required={plinActivo} disabled={!plinActivo} /></label>
            <label>Titular de Plin<input value={plinTitular} onChange={(e) => setPlinTitular(e.target.value)} minLength={3} maxLength={100} required={plinActivo} disabled={!plinActivo} /></label>
            <label>Monto máximo por compra (S/)<input type="number" min={1} step="0.01" value={plinMaximo} onChange={(e) => setPlinMaximo(Number(e.target.value))} required={plinActivo} disabled={!plinActivo} /><small>Plin solo aparecerá si el total no supera este monto.</small></label>
            <label>Imagen QR de Plin<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => cargarQr(e.target.files?.[0], setPlinQr)} disabled={!plinActivo} /></label>
          </div>
          {plinQr && <img className="qrPreview" src={plinQr} alt="Vista previa del QR de Plin" />}
        </section>
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
