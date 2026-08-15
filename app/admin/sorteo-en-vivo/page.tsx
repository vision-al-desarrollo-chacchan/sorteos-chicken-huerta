"use client";
import { useCallback, useEffect, useState } from "react";

type Winner = { premio: number; codigo: string; nombre: string };
export default function SorteoEnVivo() {
  const [codigos, setCodigos] = useState<string[]>([]), [display, setDisplay] = useState("CH-000000"),
    [girando, setGirando] = useState(false), [winner, setWinner] = useState<Winner | null>(null),
    [ganadores, setGanadores] = useState<Winner[]>([]), [error, setError] = useState(""),
    [config, setConfig] = useState({ premio1: "Primer premio", premio2: "Segundo premio" });
  const cargar = useCallback(async () => {
    const [r, sorteo] = await Promise.all([fetch("/api/admin/elegibles", { cache: "no-store" }), fetch("/api/sorteo", { cache: "no-store" }).then(x => x.json())]);
    if (r.status === 401) { setError("Inicia sesión como administrador para abrir esta pantalla."); return; }
    const d = await r.json(); setCodigos(d.codigos || []); setGanadores(sorteo.ganadores || []); setConfig(sorteo);
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void cargar(), 0); return () => window.clearTimeout(timer); }, [cargar]);
  async function sortear(premio: number) {
    if (!codigos.length || girando || ganadores.some(g => g.premio === premio) || !confirm(`¿Iniciar en vivo el sorteo del ${premio}.º premio?`)) return;
    setError(""); setWinner(null); setGirando(true);
    const r = await fetch("/api/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ premio }) });
    const d = await r.json();
    if (!r.ok) { setGirando(false); setError(d.message || "No se pudo realizar el sorteo."); return; }
    let ticks = 0;
    const timer = window.setInterval(() => {
      setDisplay(codigos[Math.floor(Math.random() * codigos.length)] || "CH-000000"); ticks++;
      if (ticks >= 35) { window.clearInterval(timer); setDisplay(d.ganador.codigo); setWinner(d.ganador); setGirando(false); void cargar(); }
    }, 80);
  }
  return <main className="liveDraw">
    <header><div><p className="eyebrow">CHICKEN HUERTA · SORTEO EN VIVO</p><h1>Selector oficial de ganador</h1></div><a href="/admin">Volver al panel</a></header>
    <section className={girando ? "drawStage spinning" : "drawStage"}>
      <p>{girando ? "SELECCIONANDO ENTRE TICKETS APROBADOS" : winner ? `${winner.premio}.º PREMIO` : "LISTO PARA SORTEAR"}</p>
      <strong>{display}</strong>
      {winner && <div className="winnerReveal"><span>GANADOR</span><h2>{winner.nombre}</h2><p>{winner.premio === 1 ? config.premio1 : config.premio2}</p></div>}
    </section>
    <section className="liveControls"><div><b>{codigos.length}</b><span>tickets habilitados</span></div><button disabled={girando || !codigos.length || ganadores.some(g => g.premio === 1)} onClick={() => sortear(1)}>{ganadores.some(g => g.premio === 1) ? "1.er premio sorteado" : "Sortear 1.er premio"}</button><button disabled={girando || !codigos.length || ganadores.some(g => g.premio === 2)} onClick={() => sortear(2)}>{ganadores.some(g => g.premio === 2) ? "2.º premio sorteado" : "Sortear 2.º premio"}</button><button className="secondary" onClick={() => document.documentElement.requestFullscreen?.()}>Pantalla completa</button></section>
    {ganadores.length > 0 && <section className="pastWinners">{ganadores.map(g => <article key={g.premio}><span>{g.premio}.º PREMIO</span><strong>{g.codigo}</strong><b>{g.nombre}</b><small>{g.premio === 1 ? config.premio1 : config.premio2}</small></article>)}</section>}
    {error && <p className="error">{error}</p>}<p className="liveNote">La elección se registra automáticamente. Solo se incluyen pagos aprobados y tickets físicos vendidos e identificados.</p>
  </main>;
}
