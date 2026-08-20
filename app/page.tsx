"use client";
import { FormEvent, useEffect, useState } from "react";
import SorteoInfo from "./SorteoInfo";
type TicketResult = { ok: boolean; tickets?: string[]; message?: string };
type MetodoPago = { id: "yape" | "plin" | "bcp" | "interbank"; nombre: string; numero: string; titular: string; maximo: number; qr: string; tipo?: "billetera" | "banco"; cci?: string };
export default function Home() {
  const [cantidad, setCantidad] = useState(1),
    [loading, setLoading] = useState(false),
    [result, setResult] = useState<TicketResult | null>(null),
    [consulta, setConsulta] = useState(""),
    [consultaDni, setConsultaDni] = useState(""),
    [consultaMsg, setConsultaMsg] = useState(""),
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
      setResult(await r.json());
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
    const r = await fetch(
        `/api/participantes?ticket=${encodeURIComponent(consulta)}&identidad=${encodeURIComponent(consultaDni)}`,
      ),
      d = await r.json();
    setConsultaMsg(
      d.encontrado
        ? `${d.ticket} pertenece a ${d.nombre}. Estado: ${d.estado}.`
        : d.message || "No encontramos ese ticket.",
    );
  }
  function texto() {
    return `Sorteo Chicken Huerta\nMis tickets: ${result?.tickets?.join(", ")}\nEstado: pendiente de revisión de pago.`;
  }
  async function copiar() {
    await navigator.clipboard.writeText(result?.tickets?.join(", ") || "");
    alert("Tickets copiados");
  }
  function descargar() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([texto()], { type: "text/plain" }));
    a.download = "tickets-chicken-huerta.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function compartir() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(texto())}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
  function imprimir() {
    const codes = result?.tickets || [];
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return;
    w.document.write(
      `<title>Tickets Chicken Huerta</title><style>body{font-family:Arial;padding:24px}.t{border:2px dashed #222;padding:22px;margin:12px;display:inline-block;width:290px;text-align:center}.t b{display:block;font-size:28px;margin:18px}</style>${codes.map((c) => `<article class="t"><h2>CHICKEN HUERTA</h2><p>${premio1} y ${premio2} · S/${precio}</p><b>${c}</b><small>Pendiente de validación de pago</small></article>`).join("")}`,
    );
    w.document.close();
    w.print();
  }
  const total = cantidad * precio;
  const metodosDisponibles = metodosPago.filter((m) => total <= m.maximo);
  const metodoSeleccionado = metodosDisponibles.find((m) => m.id === metodoId) || metodosDisponibles[0];
  return (
    <main>
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
          <h2>Consulta tu ticket</h2>
          <p>Ingresa el código completo para comprobar su registro y estado.</p>
        </div>
        <form onSubmit={consultar}>
          <input
            value={consulta}
            onChange={(e) => setConsulta(e.target.value.toUpperCase())}
            placeholder="CH-000001"
            required
          />
          <input
            className="lookupIdentity"
            value={consultaDni}
            onChange={(e) =>
              setConsultaDni(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            inputMode="numeric"
            placeholder="Últimos 4 dígitos del DNI"
            required
          />
          <button>Consultar</button>
          {consultaMsg && <p className="lookupResult">{consultaMsg}</p>}
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
                        onChange={(e) => setDni(e.target.value)}
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
                        onChange={(e) => setCelular(e.target.value)}
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
                    <input type="checkbox" required /> Confirmo que el pago es verdadero y acepto las <a href="/bases-legales" target="_blank">bases legales</a> y el <a href="/privacidad" target="_blank">aviso de privacidad</a>. Si no es válido, mis tickets serán anulados.
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
