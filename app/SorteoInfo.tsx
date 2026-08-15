"use client";
import {useEffect,useState} from "react";
type Ganador={premio:number;codigo:string;nombre:string};
const formato=(v:string)=>new Date(v).toLocaleString("es-PE",{dateStyle:"long",timeStyle:"short",timeZone:"America/Lima"});
export default function SorteoInfo({compact=false}:{compact?:boolean}){
  const[inicio,setInicio]=useState<string|null>(null),[fin,setFin]=useState<string|null>(null),[ganadores,setGanadores]=useState<Ganador[]>([]);
  useEffect(()=>{const cargar=()=>fetch(`/api/sorteo?t=${Date.now()}`,{cache:"no-store"}).then(r=>r.json()).then(d=>{setInicio(d.inicio);setFin(d.fin);setGanadores(d.ganadores||[])}).catch(()=>{});cargar();window.addEventListener("focus",cargar);const timer=window.setInterval(cargar,60000);return()=>{window.removeEventListener("focus",cargar);window.clearInterval(timer)}},[]);
  return <section className={compact?"announcement compactAnnouncement":"announcement"}><p className="eyebrow">INFORMACIÓN OFICIAL</p>{!compact&&<h2>Fechas del sorteo</h2>}<div className="dateRange"><article><span>INICIO</span><strong>{inicio?formato(inicio):"Por anunciar"}</strong></article><article><span>FINALIZACIÓN</span><strong>{fin?formato(fin):"Por anunciar"}</strong></article></div>{!compact&&(ganadores.length?<div className="winnerPublic">{ganadores.map(g=><article key={g.premio}><b>{g.premio}° premio</b><strong>{g.codigo}</strong><span>{g.nombre}</span></article>)}</div>:<p>Los ganadores aparecerán aquí cuando sean anunciados oficialmente.</p>)}</section>;
}
