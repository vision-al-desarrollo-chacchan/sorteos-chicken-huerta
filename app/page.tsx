"use client";
import { FormEvent, useEffect, useState } from "react";
import SorteoInfo from "./SorteoInfo";
type TicketResult = { ok: boolean; tickets?: string[]; message?: string };
type ConsultaTicket = { codigo: string; estado: string };
type MetodoPago = { id: "yape" | "plin" | "bcp" | "interbank"; nombre: string; numero: string; titular: string; maximo: number; qr: string; tipo?: "billetera" | "banco"; cci?: string };
export default function Home() {
  const [cantidad, setCantidad] = useState(1),
    [loading, setLoading] = useState(false),
    [result, setResult] = useState<TicketResult | null>(null),
    [consultaDni, setConsultaDni] = useState(""),
    [consultaMsg, setConsultaMsg] = useState(""),
    [consultaTickets, setConsultaTickets] = useState<ConsultaTicket[]>([]),
    [consultando, setConsultando] = useState(false),
    [open, setOpen] = useState(false),
    [step, setStep] = useState(1),
    [nombre, setNombre] = useState(""),
    [dni, setDni] = useState(""),
    [celular, setCelular] = useState(""),
    [operacion, setOperacion] = useState(""),
    [operacionActiva, setOperacionActiva] = useState(false),
    [yape, setYape] = useState(""),
    [titular, setTitular] = useState("Elvis Esteban Infantes Huerta"),
    [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]),
    [metodoId, setMetodoId] = useState<MetodoPago["id"]>("yape"),
    [precio, setPrecio] = useState(5),
    [premio1, setPremio1] = useState("Rezzio Kratos Pro 4.0"),
    [premio2, setPremio2] = useState("Tekken 300"),
    [imagen1, setImagen1] = useState("/kratos-pro.png"),
    [imagen2, setImagen2] = useState("/tekken-rezzio-300.png"),
    [condiciones, setCondiciones] = useState("Cada ticket aprobado participa por ambos premios.");
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  useEffect(() => {
    try {
      const borrador = JSON.parse(sessionStorage.getItem("chicken-ticket-draft") || "null");
      if (!borrador) return;
      setNombre(String(borrador.nombre || ""));
      setDni(String(borrador.dni || "").replace(/\D/g, "").slice(0, 8));
      setCelular(String(borrador.celular || "").replace(/\D/g, "").slice(0, 9));
      setCantidad(Math.min(100, Math.max(1, Number(borrador.cantidad) || 1)));
    } catch { /* ignorar borradores dañados */ }
  }, []);
  useEffect(() => {
    sessionStorage.setItem("chicken-ticket-draft", JSON.stringify({ nombre, dni, celular, cantidad }));
  }, [nombre, dni, celular, cantidad]);
  useEffect(() => {
    fetch("/api/sorteo", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setYape(d.yape || "");
        setTitular(d.titular || "Elvis Esteban Infantes Huerta");
        const metodos = (d.metodosPago || []) as MetodoPago[];
        setMetodosPago(metodos);
        if (metodos[0]) setMetodoId(metodos[0].id);
        setPrecio(d.precio || 5); setPremio1(d.premio1 || "Rezzio Kratos Pro 4.0");
        setPremio2(d.premio2 || "Tekken 300"); setImagen1(d.imagen1 || "/kratos-pro.png");
        setImagen2(d.imagen2 || "/tekken-rezzio-300.png"); setCondiciones(d.condiciones || "");
      })
      .catch(() => {});
  }, []);
  function abrir() {
    setOpen(true);
    setStep(1);
    setResult(null);
    const disponible = metodosPago.find((m) => cantidad * precio <= m.maximo);
    if (disponible) setMetodoId(disponible.id);
  }
  function cerrar() {
    if (!loading) setOpen(false);
  }
  function continuar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!metodoSeleccionado) return;
    setMetodoId(metodoSeleccionado.id);
    setOperacion("");
    setOperacionActiva(false);
    setStep(2);
  }
  async function registrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const form = new FormData(e.currentTarget);
    form.set("cantidad", String(cantidad));
    form.set("nombre", nombre);
    form.set("dni", dni);
    form.set("celular", celular);
    form.set("metodo", metodoId);
    form.set("operacion", operacion);
    try {
      const r = await fetch("/api/participantes", {
        method: "POST",
        body: form,
      });
      const data = await r.json();
      setResult(data);
      if (data.ok) sessionStorage.removeItem("chicken-ticket-draft");
    } catch {
      setResult({
        ok: false,
        message: "No pudimos registrar la compra. Intenta nuevamente.",
      });
    } finally {
      setLoading(false);
    }
  }
  async function consultar(e: FormEvent) {
    e.preventDefault();
    setConsultando(true);
    setConsultaMsg("");
    setConsultaTickets([]);
    try {
      const r = await fetch(`/api/participantes?dni=${encodeURIComponent(consultaDni)}`, { cache: "no-store" });
      const d = await r.json();
      const encontrados = Array.isArray(d.tickets) ? d.tickets : [];
      setConsultaTickets(encontrados);
      setConsultaMsg(
        d.encontrado
          ? `Tienes ${d.cantidad} ${d.cantidad === 1 ? "ticket registrado" : "tickets registrados"}.`
          : d.message || "No encontramos tickets registrados con este DNI.",
      );
    } catch {
      setConsultaMsg("No pudimos realizar la consulta. Intenta nuevamente.");
    } finally {
      setConsultando(false);
    }
  }
  function texto() {
    return `Sorteo Chicken Huerta\nMis tickets: ${result?.tickets?.join(", ")}\nEstado: pendiente de revisión de pago.`;
  }
  async function copiar() {
    await navigator.clipboard.writeText(result?.tickets?.join(", ") || "");
    alert("Tickets copiados");
  }
  function cargarImagen(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
  async function crearTicketDigital() {
    const codes = result?.tickets || [];
    const filas = Math.max(1, Math.ceil(codes.length / 2));
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = Math.max(1350, 790 + filas * 105);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo crear la imagen");
    const [logo, moto1, moto2] = await Promise.all([
      cargarImagen("/logo-chicken-huerta.jpg"),
      cargarImagen(imagen1),
      cargarImagen(imagen2),
    ]);
    const fondo = ctx.createLinearGradient(0, 0, 1080, canvas.height);
    fondo.addColorStop(0, "#120b08");
    fondo.addColorStop(.52, "#3a0908");
    fondo.addColorStop(1, "#0a0705");
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4b321";
    ctx.fillRect(0, 0, 1080, 18);
    ctx.drawImage(logo, 55, 55, 150, 150);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 58px Arial";
    ctx.fillText("TICKET OFICIAL", 245, 105);
    ctx.fillStyle = "#f4b321";
    ctx.font = "900 42px Arial";
    ctx.fillText("SORTEO CHICKEN HUERTA", 245, 160);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 26px Arial";
    ctx.fillText("UN TICKET PARTICIPA POR LAS 2 MOTOS", 245, 205);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(45, 245, 990, 330);
    ctx.drawImage(moto1, 65, 275, 455, 245);
    ctx.drawImage(moto2, 560, 275, 455, 245);
    ctx.fillStyle = "#18150f";
    ctx.font = "900 27px Arial";
    ctx.textAlign = "center";
    ctx.fillText(premio1.toUpperCase(), 290, 555);
    ctx.fillText(premio2.toUpperCase(), 790, 555);
    ctx.textAlign = "left";
    ctx.fillStyle = "#f4b321";
    ctx.font = "900 32px Arial";
    ctx.fillText(`PARTICIPANTE: ${nombre.toUpperCase()}`, 55, 635);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 25px Arial";
    ctx.fillText(`DNI: ****${dni.slice(-4)}   ·   PRECIO: S/${precio} CADA TICKET`, 55, 680);
    ctx.fillStyle = "#d62d20";
    ctx.fillRect(45, 720, 990, 64);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 28px Arial";
    ctx.textAlign = "center";
    ctx.fillText("TUS CÓDIGOS DE PARTICIPACIÓN", 540, 762);
    codes.forEach((code, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 55 + col * 500;
      const y = 820 + row * 105;
      ctx.fillStyle = "#fff7d8";
      ctx.fillRect(x, y, 470, 78);
      ctx.strokeStyle = "#f4b321";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, 470, 78);
      ctx.fillStyle = "#18150f";
      ctx.font = "900 34px monospace";
      ctx.textAlign = "center";
      ctx.fillText(code, x + 235, y + 51);
    });
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 23px Arial";
    ctx.fillText("ESTADO: PENDIENTE DE VALIDACIÓN DE PAGO", 540, canvas.height - 105);
    ctx.fillStyle = "#f4b321";
    ctx.font = "900 21px Arial";
    ctx.fillText("CONSERVA ESTA IMAGEN · TU CÓDIGO ES ÚNICO", 540, canvas.height - 60);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar el ticket"))), "image/png"),
    );
  }
  async function descargar() {
    const blob = await crearTicketDigital();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ticket-chicken-huerta.png";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function compartir() {
    const blob = await crearTicketDigital();
    const archivo = new File([blob], "ticket-chicken-huerta.png", { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [archivo] })) {
      await navigator.share({ title: "Ticket Chicken Huerta", text: texto(), files: [archivo] });
      return;
    }
    await descargar();
    window.open(`https://wa.me/?text=${encodeURIComponent(`${texto()}\nAdjunta la imagen descargada.`)}`, "_blank", "noopener,noreferrer");
  }
  function imprimir() {
    const codes = result?.tickets || [];
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return;
    w.document.write(
      `<title>Tickets Chicken Huerta</title><style>@page{size:A4;margin:8mm}*{box-sizing:border-box}body{font-family:Arial;margin:0;color:#17130f}.sheet{display:grid;grid-template-columns:1fr 1fr;gap:7mm}.t{border:1px solid #222;border-left:7px solid #d62d20;break-inside:avoid;overflow:hidden;min-height:82mm}.head{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#17130f;color:#fff}.head img{width:48px;height:48px;border-radius:8px;object-fit:cover}.head div{display:flex;flex-direction:column}.head small{color:#f4b321;font-weight:900}.price{margin-left:auto;background:#f4b321;color:#17130f;padding:7px 10px;font-weight:900}.motos{display:flex;height:70px;background:#fff}.motos img{width:50%;object-fit:contain}.body{padding:10px 12px}.body h2{font-size:15px;margin:0 0 5px}.body p{font-size:10px;margin:4px 0}.code{display:block;margin:10px 0;padding:12px;background:#fff1ca;border:1px dashed #8f6c14;text-align:center;font:900 25px monospace}.status{font-size:9px;color:#8b2017;font-weight:900}.legal{font-size:8px;color:#5d574f;margin-top:7px}</style><main class="sheet">${codes.map((c) => `<article class="t"><header class="head"><img src="/logo-chicken-huerta.jpg"><div><small>SORTEO OFICIAL</small><strong>CHICKEN HUERTA</strong></div><span class="price">S/${precio}</span></header><div class="motos"><img src="${imagen1}"><img src="${imagen2}"></div><div class="body"><h2>${premio1} + ${premio2}</h2><p><b>Participante:</b> ${nombre}</p><p><b>DNI:</b> ****${dni.slice(-4)}</p><b class="code">${c}</b><div class="status">PENDIENTE DE VALIDACIÓN DE PAGO</div><p class="legal">Este código es único. Solo participa después de confirmar el pago. Conserva este ticket.</p></div></article>`).join("")}</main>`,
    );
    w.document.close();
    w.onload = () => w.print();
  }
  const total = cantidad * precio;
  const metodosDisponibles = metodosPago.filter((m) => total <= m.maximo);
  const metodoSeleccionado = metodosDisponibles.find((m) => m.id === metodoId) || metodosDisponibles[0];
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Chicken Huerta",
            url: "https://sorteos.chicken.huertadigital.net.pe/",
            logo: "https://sorteos.chicken.huertadigital.net.pe/logo-chicken-huerta.jpg",
          }),
        }}
      />
      <header className="nav">
        <a className="brand" href="#inicio">
          <img src="/logo-chicken-huerta.jpg" alt="Logo Chicken Huerta" />
          <span>Chicken Huerta</span>
        </a>
        <nav>
          <a href="#premios">Premios</a>
          <button onClick={abrir}>Participar</button>
          <a href="#bases">Bases</a>
          <a href="#consultar">Consultar ticket</a>
        </nav>
      </header>
      <section className="prizeShowcase" id="inicio">
        <div className="showcaseIntro">
          <p className="eyebrow">SORTEO VIGENTE · CHICKEN HUERTA</p>
          <h1>Participa por dos motos</h1>
          <p>
            Cada ticket cuesta S/{precio} y participa automáticamente por ambos
            premios.
          </p>
        </div>
        <SorteoInfo compact />
        <div className="bikeCards" id="premios">
          <article className="bikeCard">
            <div className="bikePhoto"><img className="configPrizeImage" src={imagen1} alt={premio1} />
              <span className="ticketBadge">
                <b>S/{precio}</b>
                <small>POR TICKET</small>
              </span>
              <div>
                <small>PRIMER PREMIO</small>
                <h2>{premio1}</h2>
              </div>
            </div>
            <div className="bikeInfo">
              <span>PREMIO PRINCIPAL</span>
              <h3>{premio1}</h3>
              <p>Moto nueva · Participación incluida con cada ticket</p>
              <button onClick={abrir}>PARTICIPAR →</button>
            </div>
          </article>
          <article className="bikeCard">
            <div className="bikePhoto"><img className="configPrizeImage" src={imagen2} alt={premio2} />
              <span className="ticketBadge">
                <b>S/{precio}</b>
                <small>POR TICKET</small>
              </span>
              <div>
                <small>SEGUNDO PREMIO</small>
                <h2>{premio2}</h2>
              </div>
            </div>
            <div className="bikeInfo">
              <span>SEGUNDO PREMIO</span>
              <h3>{premio2}</h3>
              <p>Moto nueva · Participación incluida con cada ticket</p>
              <button onClick={abrir}>PARTICIPAR →</button>
            </div>
          </article>
        </div>
        <div className="bothNotice">
          ✓ Un ticket participa por las dos motos · Puedes comprar todos los
          tickets que quieras · {condiciones}
        </div>
      </section>
      <section className="steps">
        <article>
          <b>01</b>
          <div>
            <strong>Completa tus datos</strong>
            <span>Indica cuántos tickets deseas comprar.</span>
          </div>
        </article>
        <article>
          <b>02</b>
          <div>
            <strong>Paga por Yape o transferencia</strong>
            <span>Elige Yape, BCP o Interbank y paga el total exacto.</span>
          </div>
        </article>
        <article>
          <b>03</b>
          <div>
            <strong>Recibe tus códigos</strong>
            <span>
              Se entregan inmediatamente y quedan pendientes de revisión.
            </span>
          </div>
        </article>
      </section>
      <section className="quickJoin">
        <p className="eyebrow">PARTICIPA AHORA</p>
        <h2>¿Listo para ganar?</h2>
        <p>
          Llena tus datos, paga con Yape, BCP o Interbank y recibe tus tickets en pocos pasos.
        </p>
        <button className="primary" onClick={abrir}>
          COMPRAR TICKETS →
        </button>
      </section>
      <section className="rules" id="bases">
        <p className="eyebrow">BASES PRINCIPALES</p>
        <h2>Reglas del sorteo</h2>
        <div className="ruleGrid">
          <article>
            <b>S/{precio} por ticket</b>
            <span>Cada código participa por ambos premios.</span>
          </article>
          <article>
            <b>Compra ilimitada</b>
            <span>
              Una persona puede comprar varios tickets con el mismo DNI y
              WhatsApp.
            </span>
          </article>
          <article>
            <b>Validación de pago</b>
            <span>
              Los tickets se entregan al registrarse y se anulan si el pago es
              falso o inválido.
            </span>
          </article>
          <article>
            <b>Sorteo transparente</b>
            <span>
              Solo participan tickets con pago confirmado. La selección queda
              registrada.
            </span>
          </article>
          <article>
            <b>Dos premios</b>
            <span>Primero {premio1} y segundo {premio2}.</span>
          </article>
          <article>
            <b>Fecha y hora oficiales</b>
            <span>
              El inicio y la finalización se muestran en la portada y se
              actualizan desde el panel.
            </span>
          </article>
        </div>
      </section>
      <SorteoInfo />
      <section className="lookup" id="consultar">
        <div>
          <p className="eyebrow">VERIFICACIÓN</p>
          <h2>Consulta tus tickets con tu DNI</h2>
          <p>Ingresa tu DNI y revisa cuántos tickets tienes y el estado de cada uno.</p>
        </div>
        <form onSubmit={consultar}>
          <input
            className="lookupIdentity"
            value={consultaDni}
            onChange={(e) =>
              setConsultaDni(e.target.value.replace(/\D/g, "").slice(0, 8))
            }
            inputMode="numeric"
            pattern="[0-9]{8}"
            maxLength={8}
            placeholder="Ingresa tu DNI de 8 dígitos"
            required
          />
          <button disabled={consultando}>{consultando ? "Consultando..." : "Consultar mis tickets"}</button>
          {consultaMsg && <p className="lookupResult">{consultaMsg}</p>}
          {consultaTickets.length > 0 && (
            <div className="lookupTickets">
              {consultaTickets.map((ticket) => (
                <p key={ticket.codigo}>
                  <b>{ticket.codigo}</b><span>{ticket.estado}</span>
                </p>
              ))}
            </div>
          )}
        </form>
      </section>
      <footer>
        <strong>Chicken Huerta</strong>
        <span>Sorteo transparente · Tickets ilimitados · S/{precio} cada uno</span>
        <small>Conserva tus códigos. <a href="/bases-legales">Bases legales</a> · <a href="/privacidad">Privacidad</a></small>
      </footer>
      {open && (
        <div
          className="modalBackdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cerrar();
          }}
        >
          <section
            className="ticketModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modalTitle"
          >
            <button className="modalClose" onClick={cerrar} aria-label="Cerrar">
              ×
            </button>
            <div className="modalProgress">
              <span className={step === 1 ? "active" : "done"}>
                1 · Tus datos
              </span>
              <span className={step === 2 ? "active" : ""}>2 · Pago</span>
            </div>
            {step === 1 ? (
              <>
                <p className="eyebrow">FORMULARIO DE PARTICIPACIÓN</p>
                <h2 id="modalTitle">Obtén tus tickets</h2>
                <p>Más tickets significan más oportunidades de ganar.</p>
                <form onSubmit={continuar}>
                  <label>
                    Nombre y apellidos
                    <input
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      required
                      minLength={3}
                      placeholder="Escribe tu nombre completo"
                    />
                  </label>
                  <div className="row">
                    <label>
                      Número de DNI
                      <input
                        value={dni}
                        onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
                        required
                        inputMode="numeric"
                        pattern="[0-9]{8}"
                        maxLength={8}
                        placeholder="Ingresa tus 8 dígitos"
                      />
                    </label>
                    <label>
                      Número de WhatsApp
                      <input
                        value={celular}
                        onChange={(e) => setCelular(e.target.value.replace(/\D/g, "").slice(0, 9))}
                        required
                        inputMode="tel"
                        pattern="[0-9]{9}"
                        maxLength={9}
                        placeholder="987654321"
                      />
                    </label>
                  </div>
                  <label>
                    Cantidad de tickets
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={cantidad}
                      onChange={(e) =>
                        setCantidad(Math.max(1, Number(e.target.value)))
                      }
                    />
                  </label>
                  <div className="total">
                    <span>Total a pagar</span>
                    <strong>S/{total}</strong>
                  </div>
                  {metodosDisponibles.length > 0 ? <div className="paymentMethods" aria-label="Métodos de pago disponibles">
                    {metodosDisponibles.map((m) => <button type="button" key={m.id} className={metodoId === m.id ? "active" : ""} onClick={() => setMetodoId(m.id)}>Pagar con {m.nombre}</button>)}
                  </div> : <p className="paymentLimit">El monto supera el límite de los métodos disponibles. Reduce la cantidad de tickets.</p>}
                  <button className="primary submit" disabled={!metodoSeleccionado}>
                    CONTINUAR AL PAGO →
                  </button>
                  <small className="protected">
                    🔒 Tus datos están protegidos.
                  </small>
                </form>
              </>
            ) : (
              <>
                <p className="eyebrow">PAGO CON {metodoSeleccionado?.nombre.toUpperCase()}</p>
                <h2 id="modalTitle">Paga S/{total}</h2>
                <div className="modalPay">
                  {metodoSeleccionado?.qr ? (
                    <img
                      src={metodoSeleccionado.qr}
                      alt={`Código QR oficial de ${metodoSeleccionado.nombre}`}
                    />
                  ) : (
                    <div className={`bankBadge bankBadge-${metodoSeleccionado?.id}`}>
                      <img
                        src={metodoSeleccionado?.id === "bcp" ? "/logo-bcp-oficial.png" : "/logo-interbank-oficial.png"}
                        alt={`Logo de ${metodoSeleccionado?.nombre}`}
                      />
                      <small>TRANSFERENCIA BANCARIA</small>
                    </div>
                  )}
                  <div>
                    <b>{metodoSeleccionado?.titular}</b>
                    {metodoSeleccionado?.numero && (
                      <strong className="yapeNumber">{metodoSeleccionado.tipo === "banco" ? "Cuenta" : metodoSeleccionado.nombre}: {metodoSeleccionado.numero}</strong>
                    )}
                    {metodoSeleccionado?.cci && (
                      <strong className="yapeNumber">CCI: {metodoSeleccionado.cci}</strong>
                    )}
                    <p>
                      {metodoSeleccionado?.qr ? "Escanea el QR y paga el monto exacto." : "Transfiere el monto exacto a esta cuenta."} Luego adjunta tu comprobante.
                    </p>
                    <button
                      className="backBtn"
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setResult(null);
                      }}
                    >
                      ← Corregir datos
                    </button>
                  </div>
                </div>
                <form onSubmit={registrar} autoComplete="off">
                  <label>
                    N.º de operación
                    <input
                      name="referencia_pago_manual"
                      value={operacion}
                      onChange={(e) => setOperacion(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40))}
                      onFocus={() => {
                        setOperacion("");
                        setOperacionActiva(true);
                      }}
                      readOnly={!operacionActiva}
                      autoComplete="new-password"
                      inputMode="numeric"
                      pattern="[A-Za-z0-9-]{4,40}"
                      required
                      placeholder={`Código único de ${metodoSeleccionado?.nombre}`}
                    />
                    <span className="operationHelp">
                      <b>¿DÓNDE ENCUENTRO ESTE CÓDIGO?</b>
                      Abre tu comprobante de {metodoSeleccionado?.nombre} y busca
                      <strong> “N.º de operación”</strong>. Copia únicamente ese
                      código. No escribas tu nombre ni tu número de celular.
                      <small>Ejemplo: 12345678</small>
                    </span>
                  </label>
                  <label>
                    Comprobante de pago
                    <input
                      className="fileInput"
                      type="file"
                      name="comprobante"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      required
                    />
                    <small>Foto o PDF, máximo 5 MB.</small>
                  </label>
                  <label className="check">
                    <input type="checkbox" required />
                    <span>
                      Confirmo que el pago es verdadero y acepto las{" "}
                      <a href="/bases-legales" target="_blank">bases legales</a>{" "}
                      y el <a href="/privacidad" target="_blank">aviso de privacidad</a>.
                      Si no es válido, mis tickets serán anulados.
                    </span>
                  </label>
                  <button className="primary submit" disabled={loading}>
                    {loading
                      ? "Generando tickets..."
                      : "ADJUNTAR Y OBTENER TICKETS"}
                  </button>
                  {result && (
                    <div className={result.ok ? "success" : "error"}>
                      {result.ok ? (
                        <>
                          <b>¡Tus tickets ya fueron generados!</b>
                          <p>{result.tickets?.join(", ")}</p>
                          <small>
                            Estado: pendiente de revisión. Guarda estos códigos.
                          </small>
                          <div className="ticketActions">
                            <button type="button" onClick={copiar}>
                              Copiar
                            </button>
                            <button type="button" onClick={descargar}>
                              Descargar
                            </button>
                            <button type="button" onClick={compartir}>
                              Enviar por WhatsApp
                            </button>
                            <button type="button" onClick={imprimir}>
                              Imprimir tickets
                            </button>
                          </div>
                        </>
                      ) : (
                        result.message
                      )}
                    </div>
                  )}
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
