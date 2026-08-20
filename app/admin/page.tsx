"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
type Registro = {
  id: number;
  nombre: string;
  dni: string;
  celular: string;
  operacion: string;
  cantidad: number;
  monto: number;
  estado: string;
  creado: string;
  comprobanteKey: string;
  tickets: string;
};
type Ganador = {
  id: number;
  premio: number;
  codigo: string;
  nombre: string;
  dni: string;
  creado: string;
};
type Auditoria = {
  id: number;
  accion: string;
  detalle: string;
  administrador: string;
  creado: string;
};
export default function Admin() {
  const [rows, setRows] = useState<Registro[]>([]),
    [winners, setWinners] = useState<Ganador[]>([]),
    [audit, setAudit] = useState<Auditoria[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [q, setQ] = useState(""),
    [filtro, setFiltro] = useState("todos");
  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin");
    if (r.status === 401) {
      setError("Inicia sesión con la cuenta administradora para continuar.");
      setLoading(false);
      return;
    }
    const d = await r.json();
    setRows(d.registros || []);
    setWinners(d.ganadores || []);
    setAudit(d.auditoria || []);
    setLoading(false);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (filtro === "todos" || r.estado === filtro) &&
          `${r.nombre} ${r.dni} ${r.celular} ${r.operacion} ${r.tickets}`
            .toLowerCase()
            .includes(q.toLowerCase()),
      ),
    [rows, q, filtro],
  );
  async function change(id: number, estado: string) {
    if (
      estado === "rechazado" &&
      !confirm("¿Anular estos tickets por pago no válido?")
    )
      return;
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, estado }),
    });
    await load();
  }
  async function eliminar(id: number) {
    if (
      !confirm(
        "¿Eliminar definitivamente este registro de prueba, sus tickets y su comprobante?",
      )
    )
      return;
    const seguro = prompt("Escribe ELIMINAR para confirmar");
    if (seguro !== "ELIMINAR") return;
    const r = await fetch("/api/admin/eliminar", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!r.ok) {
      const d = await r.json();
      alert(d.message || "No se pudo eliminar");
      return;
    }
    await load();
  }
  async function ajustarTickets(registro: Registro) {
    const precio = registro.cantidad > 0 ? registro.monto / registro.cantidad : 5;
    const valor = prompt(
      `¿Cuántos tickets pagó ${registro.nombre}? Cada ticket cuesta S/${precio}.`,
      String(registro.cantidad),
    );
    if (valor === null) return;
    const cantidad = Number(valor);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 100) {
      alert("Ingresa una cantidad válida entre 1 y 100.");
      return;
    }
    if (
      !confirm(
        `Se ajustará a ${cantidad} ticket${cantidad === 1 ? "" : "s"} y S/${cantidad * precio}. ¿Confirmas?`,
      )
    )
      return;
    const response = await fetch("/api/admin/ajustar", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: registro.id, cantidad }),
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.message || "No se pudo corregir la cantidad.");
      return;
    }
    await load();
  }
  async function resetWinner(premio: number) {
    if (
      !confirm(
        `¿Anular el ganador del ${premio}° premio? La acción quedará en el historial.`,
      )
    )
      return;
    const seguro = prompt("Escribe ANULAR GANADOR para confirmar");
    if (seguro !== "ANULAR GANADOR") return;
    await fetch("/api/admin", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ premio }),
    });
    await load();
  }
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    location.href = "/admin/login";
  }
  function descargarCsv(nombre: string, head: string[], body: unknown[][]) {
    const csv = [head, ...body].map((x) => x.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")).join("\n"),
      a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" }));
    a.download = nombre; a.click(); URL.revokeObjectURL(a.href);
  }
  function exportar(filtroEstado?: string) {
    const head = [
        "Nombre",
        "DNI",
        "WhatsApp",
        "Operacion",
        "Cantidad",
        "Monto",
        "Estado",
        "Tickets",
      ],
      body = rows.filter(r => !filtroEstado || r.estado === filtroEstado).map((r) => [
        r.nombre,
        r.dni,
        r.celular,
        r.operacion,
        r.cantidad,
        r.monto,
        r.estado,
        r.tickets,
      ]);
    descargarCsv(filtroEstado ? "tickets-aprobados.csv" : "participantes-completos.csv", head, body);
  }
  async function exportarFisicos() {
    const r = await fetch("/api/admin/fisicos"), d = await r.json(), tickets = d.tickets || [];
    descargarCsv("tickets-fisicos.csv", ["Codigo","Estado","Comprador","DNI","Celular","Creado"], tickets.map((t: {codigo:string;estado:string;compradorNombre?:string;compradorDni?:string;compradorCelular?:string;creado:string}) => [t.codigo,t.estado,t.compradorNombre,t.compradorDni,t.compradorCelular,t.creado]));
  }
  function exportarGanadores() {
    descargarCsv("ganadores.csv", ["Premio","Codigo","Nombre","DNI","Fecha"], winners.map(w => [w.premio,w.codigo,w.nombre,w.dni,w.creado]));
  }
  return (
    <main className="admin">
      <header className="adminHead">
        <div>
          <p className="eyebrow">CHICKEN HUERTA</p>
          <h1>Panel del sorteo</h1>
          <p>Revisa comprobantes, controla tickets y registra ganadores.</p>
        </div>
        <nav className="adminLinks">
          <a href="/admin/tickets-fisicos">Tickets físicos</a>
          <a href="/admin/configuracion">Fecha y anuncios</a>
          <a href="/admin/sorteo-en-vivo">Sorteo en vivo</a>
          <Link href="/">Ver página pública</Link>
          <button onClick={logout}>Cerrar sesión</button>
        </nav>
      </header>
      <section className="stats">
        <article>
          <span>Registros</span>
          <strong>{rows.length}</strong>
        </article>
        <article>
          <span>Tickets vigentes</span>
          <strong>
            {rows
              .filter((r) => r.estado !== "rechazado")
              .reduce((n, r) => n + r.cantidad, 0)}
          </strong>
        </article>
        <article>
          <span>Ventas aprobadas</span>
          <strong>
            S/
            {rows
              .filter((r) => r.estado === "aprobado")
              .reduce((n, r) => n + r.monto, 0)}
          </strong>
        </article>
      </section>
      <section className="drawPanel">
        <div>
          <h2>Sorteo de ganadores</h2>
          <p>La selección se realiza únicamente desde la pantalla oficial en vivo.</p>
        </div>
        <a className="primary" href="/admin/sorteo-en-vivo">Abrir sorteo en vivo</a>
        {winners.map((w) => (
          <article key={w.id}>
            <b>
              {w.premio}° premio: {w.codigo}
            </b>
            <span>
              {w.nombre} · DNI {w.dni}
            </span>
            <button className="reject" onClick={() => resetWinner(w.premio)}>
              Anular ganador
            </button>
          </article>
        ))}
      </section>
      {loading && <p className="notice">Cargando registros…</p>}
      {error && (
        <div className="notice">
          <p>{error}</p>
          <a className="primary" href="/admin/login">
            Iniciar sesión privada
          </a>
        </div>
      )}
      {!loading && !error && (
        <>
          <div className="adminTools">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar nombre, DNI, operación o ticket"
            />
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="pendiente">Pendientes</option>
              <option value="aprobado">Aprobados</option>
              <option value="rechazado">Anulados</option>
            </select>
            <button onClick={() => exportar()}>Todos CSV</button>
          </div>
          <div className="exportBar">
            <b>Exportar:</b><button onClick={() => exportar("aprobado")}>Solo aprobados</button><button onClick={exportarFisicos}>Tickets físicos</button><button onClick={exportarGanadores}>Ganadores</button>
          </div>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Participante</th>
                  <th>Pago</th>
                  <th>Tickets</th>
                  <th>Comprobante</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.nombre}</b>
                      <small>
                        DNI {r.dni} · {r.celular}
                      </small>
                    </td>
                    <td>
                      <b>S/{r.monto}</b>
                      <small>Op. {r.operacion}</small>
                    </td>
                    <td className="codes">{r.tickets}</td>
                    <td>
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={`/api/comprobantes?key=${encodeURIComponent(r.comprobanteKey)}`}
                      >
                        Ver archivo
                      </a>
                    </td>
                    <td>
                      <span className={`status ${r.estado}`}>
                        {r.estado === "rechazado" ? "anulado" : r.estado}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button onClick={() => change(r.id, "aprobado")}>
                          Confirmar pago
                        </button>
                        <button onClick={() => ajustarTickets(r)}>
                          Corregir monto/tickets
                        </button>
                        <button
                          className="reject"
                          onClick={() => change(r.id, "rechazado")}
                        >
                          Anular tickets
                        </button>
                        <button
                          className="deleteBtn"
                          onClick={() => eliminar(r.id)}
                        >
                          Eliminar registro
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visible.length === 0 && (
              <p className="empty">No hay registros con ese filtro.</p>
            )}
          </div>
          <section className="auditList">
            <h2>Historial de acciones</h2>
            {audit.map((a) => (
              <article key={a.id}>
                <b>{a.accion}</b>
                <span>{a.detalle}</span>
                <small>
                  {new Date(a.creado).toLocaleString("es-PE")} ·{" "}
                  {a.administrador}
                </small>
              </article>
            ))}
            {audit.length === 0 && (
              <p className="empty">Todavía no hay acciones registradas.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
