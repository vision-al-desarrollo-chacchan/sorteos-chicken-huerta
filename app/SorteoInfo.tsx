"use client";
import { useEffect, useState } from "react";

type Ganador = { premio: number; codigo: string; nombre: string };

const INICIO_OFICIAL = "2026-08-19T05:00:00.000Z";
const FIN_OFICIAL = "2026-10-03T21:00:00.000Z";

const formato = (valor: string) =>
  new Date(valor).toLocaleString("es-PE", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Lima",
  });

export default function SorteoInfo({ compact = false }: { compact?: boolean }) {
  // Las fechas oficiales se renderizan desde el primer HTML para Google.
  // La API sigue teniendo prioridad si el administrador las actualiza.
  const [inicio, setInicio] = useState<string | null>(INICIO_OFICIAL);
  const [fin, setFin] = useState<string | null>(FIN_OFICIAL);
  const [ganadores, setGanadores] = useState<Ganador[]>([]);

  useEffect(() => {
    const cargar = () =>
      fetch(`/api/sorteo?t=${Date.now()}`, { cache: "no-store" })
        .then((respuesta) => respuesta.json())
        .then((datos) => {
          setInicio(datos.inicio || INICIO_OFICIAL);
          setFin(datos.fin || FIN_OFICIAL);
          setGanadores(datos.ganadores || []);
        })
        .catch(() => {});

    cargar();
    window.addEventListener("focus", cargar);
    const timer = window.setInterval(cargar, 60000);

    return () => {
      window.removeEventListener("focus", cargar);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className={compact ? "announcement compactAnnouncement" : "announcement"}>
      <p className="eyebrow">INFORMACIÓN OFICIAL</p>
      {!compact && <h2>Fechas del sorteo</h2>}
      <div className="dateRange">
        <article>
          <span>INICIO</span>
          <strong>{inicio ? formato(inicio) : "Por anunciar"}</strong>
        </article>
        <article>
          <span>FINALIZACIÓN</span>
          <strong>{fin ? formato(fin) : "Por anunciar"}</strong>
        </article>
      </div>
      {!compact &&
        (ganadores.length ? (
          <div className="winnerPublic">
            {ganadores.map((ganador) => (
              <article key={ganador.premio}>
                <b>{ganador.premio}° premio</b>
                <strong>{ganador.codigo}</strong>
                <span>{ganador.nombre}</span>
              </article>
            ))}
          </div>
        ) : (
          <p>Los ganadores aparecerán aquí cuando sean anunciados oficialmente.</p>
        ))}
    </section>
  );
}
