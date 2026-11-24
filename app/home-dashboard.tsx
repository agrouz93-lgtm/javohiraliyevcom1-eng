'use client';
import dynamic from 'next/dynamic';
import {ArrowRight,Box,Calculator,FolderOpen,Layers3,Plus,Ruler,ScanLine} from 'lucide-react';
import {validPlan} from './domain.mjs';
import {fmt,type Entry,type RecordRow,type Plan} from './shared';
const FeatureArt3D=dynamic(()=>import('./feature-art-3d'),{ssr:false,loading:()=> <div className="home-feature-art home-skeleton"/>});
const features=[
 {title:'O‘lchash',text:'Maydon, uzunlik, kenglik va perimetrni aniq o‘lchang.',icon:ScanLine,tone:'measure',page:1},
 {title:'Materiallarni sanash',text:'Qurilish materiallari miqdorini avtomatik hisoblang.',icon:Layers3,tone:'count',page:2},
 {title:'Dizayn',text:'Uy dizaynini yarating, 2D/3D ko‘rinishda ko‘rib chiqing.',icon:Box,tone:'design',page:3},
 {title:'Smeta (hisob-kitob)',text:'Qurilish xarajatlarini tez va aniq hisoblang.',icon:Calculator,tone:'estimate',page:4},
];
export function HomeDashboard({name,records,loading,navigate,allTools}:{name:string;records:RecordRow[];loading:boolean;navigate:(page:number,entry?:Entry)=>void;allTools:()=>void}){
 const statistics=[
  {label:'Loyihalarim',kind:'plan',icon:FolderOpen,page:5},
  {label:'O‘lchovlar',kind:'measurement',icon:Ruler,page:1},
  {label:'Material sanash',kind:'materials',icon:Layers3,page:2},
  {label:'Smetalar',kind:'estimate',icon:Calculator,page:4},
 ];
 const recent=[...records].sort((a,b)=>Date.parse(b.updated)-Date.parse(a.updated)).slice(0,3);
 return <div className="home-dashboard">
  <section className="home-hero">
   <div className="home-hero-setting" aria-hidden><img src="/modern-house.svg" alt=""/></div>
   <div className="home-hero-copy"><p className="home-greeting">👋 Assalomu alaykum,</p><h1>{name==='Usta'?'Usta':name}!</h1><button onClick={()=>navigate(3)}>Loyiha yaratish <ArrowRight size={16}/></button></div>
   <img className="home-hero-robot" src="/usta-robot-transparent.png" alt="USTA PRO quruvchi roboti" draggable={false}/>
  </section>
  <div className="home-statistics">{statistics.map(({label,kind,icon:Icon,page},index)=><button key={kind} className={'home-stat home-stat-'+index} onClick={()=>navigate(page)}><Icon size={21}/>{loading?<span className="home-skeleton"/>:<strong>{records.filter(row=>row.data.kind===kind).length}</strong>}<span>{label}</span></button>)}</div>
  <div className="home-section-heading"><h2>Asosiy imkoniyatlar</h2><button onClick={allTools}>Barchasini ko‘rish <ArrowRight size={14}/></button></div>
  <div className="home-features">{features.map(({title,icon:Icon,tone,page},index)=><button key={page} className={'home-feature '+tone} onClick={()=>navigate(page)}><span className="home-feature-icon"><Icon size={20}/></span><FeatureArt3D index={index}/><strong>{title}</strong><span className="home-feature-link" aria-hidden><ArrowRight size={16}/></span></button>)}</div>
  <div className="home-section-heading"><h2>So‘nggi loyihalar</h2><button onClick={()=>navigate(5)}>Barchasini ko‘rish <ArrowRight size={14}/></button></div>
  {loading?<div className="home-recent">{[0,1,2].map(index=><div className="home-project home-skeleton" key={index} style={{minHeight:160}}/>)}</div>:recent.length?<div className="home-recent">{recent.map(({data,updated})=>{
   const plan=validPlan(data.payload.plan)?data.payload.plan as Plan:undefined;
   const area=plan?fmt(plan.width*plan.depth)+' m²':data.rows.find(([label])=>label==='Maydon')?.[1];
   return <button className="home-project" key={data.id} onClick={()=>navigate(({measurement:1,materials:2,plan:3,estimate:4})[data.kind],data)}>
    <div className="home-project-preview">{plan?<PlanPreview plan={plan}/>:<FeatureArt index={data.kind==='measurement'?0:data.kind==='materials'?1:3}/>}<span>Saqlangan</span></div>
    <strong>{data.title}</strong><small>{area??new Date(updated).toLocaleDateString('uz-UZ')}</small>
   </button>;
  })}</div>:<div className="home-empty"><FolderOpen size={28}/><p>Hozircha loyihalar mavjud emas</p><button onClick={()=>navigate(3)}><Plus size={16}/> Yangi loyiha yaratish</button></div>}
 </div>;
}
function PlanPreview({plan}:{plan:Plan}){
 return <svg viewBox={'-1 -1 '+(plan.width+2)+' '+(plan.depth+2)} aria-label="Saqlangan uy rejasi"><rect width={plan.width} height={plan.depth} fill="#1d1740" stroke="#b78aff" strokeWidth=".12"/>{plan.elements.map(element=><rect key={element.id} x={element.x} y={element.y} width={element.w} height={element.d} fill="#7548af55" stroke="#e1b74e" strokeWidth=".06"/>)}</svg>;
}
function FeatureArt({index}:{index:number}){
 if(index===2)return <div className="home-feature-art"><img src="/modern-house.svg" alt=""/></div>;
 return <svg className="home-feature-art" viewBox="0 0 260 130" aria-hidden>
  <defs><linearGradient id={'feature-'+index} x2="1" y2="1"><stop stopColor="#b67bff"/><stop offset="1" stopColor="#513299"/></linearGradient></defs>
  {index===0?<g><path d="M35 109H239M35 84H239M35 59H239M35 34H239M60 20V120M95 20V120M130 20V120M165 20V120M200 20V120" stroke="#76659b" opacity=".4"/><path d="M70 90L100 40L205 55L173 109Z" fill="#a44dff30" stroke="#b568ff" strokeWidth="2"/>{[[70,90],[100,40],[205,55],[173,109]].map(([x,y])=><circle key={x} cx={x} cy={y} r="4" fill="#ffcf43"/>)}<rect x="160" y="21" width="55" height="31" rx="12" fill="#f8c02f" transform="rotate(12 160 21)"/><path d="M175 28v17m8-15v16m8-14v15m8-13v13" stroke="#805c19" strokeWidth="2"/></g>:index===1?<g><path d="M45 90l42-22 45 20-42 23Z" fill="#f6a649"/><path d="M45 90v20l45 18v-17m0 0l42-23v19l-42 21" fill="#c76a2c"/><path d="M55 70l35-18 36 17-36 20Z" fill="#e8a75e"/><rect x="143" y="34" width="43" height="78" rx="10" fill="#d8cdb4"/><path d="M149 55h31m-28 12h25m-23 10h20" stroke="#8d795b" strokeWidth="3"/><path d="M196 118V36l11-11v82m1-15 17-17V23" stroke="#a7a6ba" strokeWidth="8"/><path d="M127 110l24-7" stroke="#ffc84b" strokeWidth="5"/></g>:<g><rect x="88" y="16" width="92" height="106" rx="7" fill="#d7d4e4" transform="rotate(10 88 16)"/><path d="M108 42h48m-49 14h48m-49 14h48m-49 14h34" stroke="#76648e" strokeWidth="3"/><rect x="51" y="48" width="77" height="76" rx="10" fill="#66519a" stroke="#c09aff" strokeWidth="2"/><rect x="60" y="58" width="59" height="17" rx="4" fill="#afc4cd"/>{[0,1,2].flatMap(row=>[0,1,2].map(col=><rect key={row+'-'+col} x={61+col*20} y={83+row*12} width="13" height="7" rx="2" fill="#bc9ddf"/>))}<ellipse cx="199" cy="113" rx="23" ry="7" fill="#d98d18"/><ellipse cx="199" cy="106" rx="23" ry="7" fill="#ffcf49"/><ellipse cx="204" cy="95" rx="20" ry="6" fill="#ffc430"/></g>}
 </svg>;
}
