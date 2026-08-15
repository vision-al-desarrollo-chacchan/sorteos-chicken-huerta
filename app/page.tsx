"use client";

import { FormEvent, useState } from "react";
type TicketResult = { ok: boolean; tickets?: string[]; message?: string };

export default function Home() {
  const [cantidad, setCantidad] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TicketResult | null>(null);
  const [consulta, setConsulta] = useState("");
  const [consultaMsg, setConsultaMsg] = useState("");
  async function registrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setResult(null);
    const form = new FormData(event.currentTarget); form.set("cantidad",String(cantidad));
    const response = await fetch("/api/participantes", { method: "POST", body: form });
    setResult(await response.json()); setLoading(false);
  }
  async function consultar(event: FormEvent) {
    event.preventDefault(); const response = await fetch(`/api/participantes?ticket=${encodeURIComponent(consulta)}`); const data = await response.json();
    setConsultaMsg(data.encontrado ? `${data.ticket} pertenece a ${data.nombre}. Estado: ${data.estado}.` : "No encontramos ese ticket.");
  }
  return <main>
    <header className="nav"><a className="brand" href="#inicio"><img src="/logo-chicken-huerta.jpg" alt="Logo Chicken Huerta"/><span>Chicken Huerta</span></a><nav><a href="#premios">Premios</a><a href="#participar">Participar</a><a href="#consultar">Consultar ticket</a></nav></header>
    <section className="hero" id="inicio"><div className="heroCopy"><p className="eyebrow">SORTEO OFICIAL · CHICKEN HUERTA</p><h1>Un ticket.<br/><em>Dos premios.</em></h1><p className="lead">Participa por ambos premios con cada ticket. Compra todos los que quieras y aumenta tus oportunidades de ganar.</p><div className="price"><strong>S/5</strong><span>por ticket<br/>venta ilimitada</span></div><a className="primary" href="#participar">Comprar mis tickets →</a></div>
    <div className="heroCard" id="premios"><img className="motosImage" src="/motos-sorteo.png" alt="Motos Rezzio Kratos Pro 4.0 y Tekken 250 Pro, premios del sorteo"/><p>Participas automáticamente por</p><div className="prize first"><span>1.er premio</span><strong>Rezzio Kratos Pro 4.0</strong><small>Moto nueva</small></div><div className="prize"><span>2.do premio</span><strong>Tekken 250 Pro</strong><small>Moto nueva</small></div><div className="secure">✓ Un ticket participa por las dos motos</div></div></section>
    <section className="steps"><article><b>01</b><div><strong>Elige tu cantidad</strong><span>No hay límite de tickets por persona.</span></div></article><article><b>02</b><div><strong>Realiza el pago</strong><span>Yape o Plin: S/5 por cada ticket.</span></div></article><article><b>03</b><div><strong>Recibe tus códigos</strong><span>Guárdalos para el día del sorteo.</span></div></article></section>
    <section className="register" id="participar"><div className="sectionIntro"><p className="eyebrow">PARTICIPA AHORA</p><h2>Registra tu compra</h2><p>Completa tus datos y adjunta tu comprobante. Los tickets quedarán pendientes hasta que el administrador confirme el pago.</p></div><form onSubmit={registrar}><label>Nombre completo<input name="nombre" required minLength={3} placeholder="Ej. María López" /></label><div className="row"><label>DNI<input name="dni" required inputMode="numeric" pattern="[0-9]{8}" maxLength={8} placeholder="8 dígitos" /></label><label>Celular<input name="celular" required inputMode="tel" pattern="[0-9]{9}" maxLength={9} placeholder="9 dígitos" /></label></div><div className="row"><label>Cantidad de tickets<input type="number" min={1} max={100} value={cantidad} onChange={(e) => setCantidad(Math.max(1, Number(e.target.value)))} /></label><label>N.º de operación<input name="operacion" required placeholder="Código de Yape o Plin" /></label></div><label>Comprobante de pago<input className="fileInput" type="file" name="comprobante" accept="image/jpeg,image/png,image/webp,application/pdf" required/><small>Foto o PDF, máximo 5 MB.</small></label><div className="total"><span>Total a pagar</span><strong>S/{cantidad * 5}</strong></div><label className="check"><input type="checkbox" required /> Confirmo que mis datos son correctos y acepto las bases del sorteo.</label><button className="primary submit" disabled={loading}>{loading ? "Registrando compra..." : "Registrar y obtener tickets"}</button>{result && <div className={result.ok ? "success" : "error"}>{result.ok ? <><b>¡Registro recibido!</b><p>Tus tickets: {result.tickets?.join(", ")}</p><small>Estado: pendiente de validación de pago.</small></> : result.message}</div>}</form></section>
    <section className="lookup" id="consultar"><div><p className="eyebrow">VERIFICACIÓN</p><h2>Consulta tu ticket</h2><p>Ingresa el código completo para comprobar su registro.</p></div><form onSubmit={consultar}><input value={consulta} onChange={(e) => setConsulta(e.target.value.toUpperCase())} placeholder="CH-000001" required/><button>Consultar</button>{consultaMsg && <p className="lookupResult">{consultaMsg}</p>}</form></section>
    <footer><strong>Chicken Huerta</strong><span>Sorteo transparente · Tickets ilimitados · S/5 cada uno</span><small>Conserva tus códigos. La fecha del sorteo y las bases oficiales serán anunciadas por Chicken Huerta.</small></footer>
  </main>;
}
