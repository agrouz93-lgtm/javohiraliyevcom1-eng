'use client';
import {useEffect,useState} from 'react';
import {Check,House,HardHat} from 'lucide-react';
import {Robot} from './robot';

export function Brand(){return <div className="brand"><span className="brand-mark"><House size={27}/><HardHat size={17}/></span><div>USTA <b>PRO</b><small>QURILISH PLATFORMASI</small></div></div>;}
export function Splash({ready,complete}:{ready:boolean;complete:()=>void}){
  const [fonts,setFonts]=useState(false);
  const [elapsed,setElapsed]=useState(false);
  useEffect(()=>{
    let active=true;
    document.fonts.ready.then(()=>{if(active)setFonts(true);});
    const timer=setTimeout(()=>setElapsed(true),matchMedia('(prefers-reduced-motion: reduce)').matches?100:7500);
    return ()=>{active=false;clearTimeout(timer);};
  },[]);
  useEffect(()=>{if(ready&&fonts&&elapsed)complete();},[ready,fonts,elapsed,complete]);
  const progress=Math.round((Number(ready)+Number(fonts))/2*100);
  return <div className="cinematic-splash">
    <div className="blueprint-lines"/><div className="splash-ring"><House size={85}/></div>
    <div className="splash-logo"><Brand/></div>
    <div className="splash-robot"><Robot/></div>
    <div className="splash-status">{progress===100?<span><Check size={20}/> Tayyor!</span>:<span>Qurilish platformasi yuklanmoqda…</span>}
      <progress value={progress} max={100} aria-label="Resurslarni tekshirish"/><small>{progress}% · interfeys va sessiya tekshiruvi</small></div>
    <button className="splash-skip" onClick={complete}>O‘tkazib yuborish →</button>
  </div>;
}
