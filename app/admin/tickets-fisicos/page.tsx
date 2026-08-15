"use client";
import { useCallback, useEffect, useState } from "react";
type Ticket = {
  id: number;
  codigo: string;
  estado: string;
  creado: string;
  compradorNombre?: string;
  compradorDni?: string;
  compradorCelular?: string;
};
type Sorteo = { inicio?: string; fin?: string; precio?: number; premio1?: string; premio2?: string };
export default function Fisicos() {
  const [tickets, setTickets] = useState<Ticket[]>([]),
    [sorteo, setSorteo] = useState<Sorteo>({}),
    [cantidad, setCantidad] = useState(10),
    [error, setError] = useState(""),
    [ventaTicket, setVentaTicket] = useState<Ticket | null>(null),
    [ventaNombre, setVentaNombre] = useState(""),
    [ventaDni, setVentaDni] = useState(""),
    [ventaCelular, setVentaCelular] = useState(""),
    [ventaError, setVentaError] = useState(""),
    [guardandoVenta, setGuardandoVenta] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/fisicos");
    if (r.status === 401) {
      setError("Inicia sesión como administrador.");
      return;
    }
    const d = await r.json();
    setTickets(d.tickets || []);
  }, []);
  useEffect(() => {
    const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer);
  }, [load]);
  useEffect(() => { fetch("/api/sorteo", { cache: "no-store" }).then(r => r.json()).then(setSorteo).catch(() => {}); }, []);
  const fecha = (v?: string) => v ? new Date(v).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" }) : "Por anunciar";
  const dniProtegido = (dni?: string) => dni ? `****${dni.slice(-4)}` : "________________";
  async function generar() {
    if (!confirm(`¿Generar ${cantidad} tickets físicos únicos?`)) return;
    const r = await fetch("/api/admin/fisicos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cantidad }),
      }),
      d = await r.json();
    if (!r.ok) {
      alert(d.message);
      return;
    }
    await load();
  }
  function abrirVenta(ticket: Ticket) {
    setVentaTicket(ticket);
    setVentaNombre(ticket.compradorNombre || "");
    setVentaDni(ticket.compradorDni || "");
    setVentaCelular(ticket.compradorCelular || "");
    setVentaError("");
  }
  function cerrarVenta() {
    if (guardandoVenta) return;
    setVentaTicket(null);
    setVentaError("");
  }
  async function registrarVenta(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ventaTicket) return;
    if (ventaNombre.trim().length < 3) {
      setVentaError("Ingresa el nombre completo del comprador.");
      return;
    }
    if (!/^\d{8}$/.test(ventaDni)) {
      setVentaError("El DNI debe tener exactamente 8 dígitos.");
      return;
    }
    if (!/^9\d{8}$/.test(ventaCelular)) {
      setVentaError("El celular debe tener 9 dígitos y comenzar con 9.");
      return;
    }
    setGuardandoVenta(true);
    const r = await fetch("/api/admin/fisicos", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: ventaTicket.id,
          estado: "vendido",
          nombre: ventaNombre.trim(),
          dni: ventaDni,
          celular: ventaCelular,
        }),
      }),
      d = await r.json();
    setGuardandoVenta(false);
    if (!r.ok) {
      setVentaError(d.message || "No se pudo registrar la venta.");
      return;
    }
    setVentaTicket(null);
    await load();
  }
  async function estado(id: number, value: string) {
    if (value === "disponible" && !confirm("¿Volver este ticket a disponible? Se borrarán los datos del comprador."))
      return;
    if (value === "anulado" && !confirm("¿Anular definitivamente este ticket?"))
      return;
    const r = await fetch("/api/admin/fisicos", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, estado: value }),
      }),
      d = await r.json();
    if (!r.ok) {
      alert(d.message || "No se pudo actualizar");
      return;
    }
    await load();
  }
  return (
    <main className="admin physicalAdmin">
      <header className="adminHead noPrint">
        <div>
          <p className="eyebrow">CHICKEN HUERTA</p>
          <h1>Tickets físicos</h1>
          <p>
            Numeración central única. Para marcar vendido es obligatorio
            identificar al comprador.
          </p>
        </div>
        <a href="/admin">Volver al panel</a>
      </header>
      {error && <p className="notice">{error}</p>}
      <section className="physicalTools noPrint">
        <label>
          Cantidad a generar
          <input
            type="number"
            min={1}
            max={100}
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
          />
        </label>
        <button onClick={generar}>Generar tickets únicos</button>
        <button onClick={() => window.print()}>Imprimir disponibles</button>
      </section>
      <section className="printTickets">
        {tickets
          .filter((t) => t.estado !== "anulado")
          .map((t) => (
            <article className={`physicalTicket ${t.estado}`} key={t.id}>
              <div className="ticketMain">
              <div className="ticketBrand">
                <img src="/logo-chicken-huerta.jpg" alt="Chicken Huerta" />
                <div><small>SORTEO OFICIAL</small><b>CHICKEN HUERTA</b></div>
                <span><small>PRECIO</small>S/{sorteo.precio || 5}</span>
              </div>
              <div className="ticketPrize"><small>UN TICKET PARTICIPA POR AMBOS PREMIOS</small><h2>¡PARTICIPA POR UNO DE LOS 2 PREMIOS!</h2><p>1.er premio: {sorteo.premio1 || "Rezzio Kratos Pro 4.0"} · 2.º premio: {sorteo.premio2 || "Tekken 250 Pro"}</p></div>
              <div className="officialSeal"><span>TICKET OFICIAL</span><strong className="physicalCode">{t.codigo}</strong><small>ÚNICO · NO TRANSFERIBLE DESPUÉS DE REGISTRAR LA VENTA</small></div>
              <div className="ticketDates"><span><b>INICIO</b>{fecha(sorteo.inicio)}</span><span><b>CIERRE</b>{fecha(sorteo.fin)}</span></div>
              <small className="ticketLegal">Código único. Participa solo si está vendido y registrado. Consulta estado y bases en sorteo.chicken.huertadigital.net.pe</small>
              {t.compradorNombre && (
                <p className="buyer">
                  <b>Vendido a:</b> {t.compradorNombre} · DNI {dniProtegido(t.compradorDni)} ·{" "}
                  {t.compradorCelular}
                </p>
              )}
              </div>
              <aside className="ticketStub">
                <small>✂ TALÓN DE CONTROL</small>
                <img src="/logo-chicken-huerta.jpg" alt="" />
                <b>CHICKEN<br/>HUERTA</b>
                <span>CÓDIGO</span>
                <strong>{t.codigo}</strong>
                <span>PRECIO</span>
                <b>S/{sorteo.precio || 5}</b>
                <div><span>COMPRADOR</span><i>{t.compradorNombre || "________________"}</i></div>
                <div><span>DNI</span><i>{dniProtegido(t.compradorDni)}</i></div>
                <small className="stubStatus">{t.estado}</small>
              </aside>
              <div className="ticketState noPrint">
                {t.estado === "vendido" ? (
                  <>
                    <button onClick={() => abrirVenta(t)}>Corregir datos</button>
                    <button onClick={() => estado(t.id, "disponible")}>
                      Volver a disponible
                    </button>
                  </>
                ) : (
                  <button onClick={() => abrirVenta(t)}>Registrar venta</button>
                )}
                <button
                  className="reject"
                  onClick={() => estado(t.id, "anulado")}
                >
                  Anular
                </button>
              </div>
              <em className="noPrint">{t.estado}</em>
            </article>
          ))}
      </section>
      {ventaTicket && (
        <div className="saleModalBackdrop noPrint" role="presentation" onMouseDown={cerrarVenta}>
          <section
            className="saleModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="saleModalTitle"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button className="saleModalClose" type="button" onClick={cerrarVenta} aria-label="Cerrar">
              ×
            </button>
            <p className="eyebrow">TICKET {ventaTicket.codigo}</p>
            <h2 id="saleModalTitle">{ventaTicket.estado === "vendido" ? "Corregir datos de la venta" : "Registrar venta física"}</h2>
            <p>{ventaTicket.estado === "vendido" ? "Actualiza los datos necesarios y guarda la corrección." : "Completa los tres datos del comprador antes de guardar la venta."}</p>
            <form onSubmit={registrarVenta}>
              <label>
                Nombre completo
                <input
                  autoFocus
                  required
                  minLength={3}
                  autoComplete="name"
                  value={ventaNombre}
                  onChange={(e) => setVentaNombre(e.target.value)}
                  placeholder="Nombres y apellidos"
                />
              </label>
              <label>
                DNI de 8 dígitos
                <input
                  required
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={8}
                  pattern="[0-9]{8}"
                  value={ventaDni}
                  onChange={(e) => setVentaDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="Ejemplo: 12345678"
                />
              </label>
              <label>
                Celular de 9 dígitos
                <input
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={9}
                  pattern="9[0-9]{8}"
                  value={ventaCelular}
                  onChange={(e) => setVentaCelular(e.target.value.replace(/\D/g, "").slice(0, 9))}
                  placeholder="Ejemplo: 987654321"
                />
              </label>
              {ventaError && <p className="saleModalError" role="alert">{ventaError}</p>}
              <div className="saleModalActions">
                <button type="button" className="secondary" onClick={cerrarVenta}>Cancelar</button>
                <button type="submit" disabled={guardandoVenta}>
                  {guardandoVenta ? "Guardando…" : ventaTicket.estado === "vendido" ? "Guardar corrección" : "Registrar como vendido"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
