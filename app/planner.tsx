'use client';

import {useEffect, useRef, useState} from 'react';
import dynamic from 'next/dynamic';
import {furniturePlacementError,alignFurniture,furnitureEstimate,duplicateFurniture,applyFurnitureVoice,furnitureCatalog,validCatalogProduct,type FurnitureProduct} from './furniture-core.mjs';
import {PlannerVoice} from './planner-voice';
import {modelMetrics,floorOf,floorCount} from './house-model.mjs';
import {Box, Grid2X2, Redo2, Undo2} from 'lucide-react';
import {objectTypes, palettes, rectangle, roomTypes, suggestPlan, validPlan} from './domain.mjs';
import {api, download, fmt, id, json, type Element, type Entry, type Plan, type Save} from './shared';

const Scene = dynamic(() => import('./scene'), {ssr:false, loading:() => <p>3D sahna yuklanmoqda…</p>});
const initialPlan:Plan = {width:12,depth:8,lotWidth:14,lotDepth:10,height:2.8,style:'Modern',roof:false,elements:[]};
const legacyDraftKey = 'usta-planner-draft';
const snap = (value:number) => Math.round(value*4)/4;
const dimensions = {width:'Uy uzunligi (m)',depth:'Uy kengligi (m)',lotWidth:'Yer uzunligi (m)',lotDepth:'Yer kengligi (m)',height:'Devor balandligi (m)'};

export function Planner({initial,save,owner='offline'}: {initial?:Entry; save:Save;owner?:string}) {
  const draftKey='usta-planner-draft:'+owner+(initial?.id&&initial.id!=='draft'?':'+initial.id:'');
  const [plan,setPlan] = useState<Plan>(validPlan(initial?.payload.plan) ? initial!.payload.plan as Plan : initialPlan);
  const [legacy,setLegacy]=useState<Plan>();
  const [ready,setReady] = useState(false);
  const [undo,setUndo] = useState<Plan[]>(()=>validPlan(initial?.payload.beforeFurniturePlan)?[initial!.payload.beforeFurniturePlan as Plan]:[]);
  const [redo,setRedo] = useState<Plan[]>([]);
  const [selection,setSelection] = useState((initial?.payload.selectedFurniture as string)??'');
  const [view,setView] = useState<'2d'|'3d'>('2d');
  const [type,setType] = useState('Yotoqxona');
  const [message,setMessage] = useState('');
  const [prompt,setPrompt] = useState('');
  const [ai,setAI] = useState(false);
  const [busy,setBusy] = useState(false);
  const [catalogProducts,setCatalogProducts]=useState<FurnitureProduct[]>(()=>{
    try{const cached=JSON.parse(localStorage.getItem('usta-furniture-catalog')??'null');if(Array.isArray(cached?.products))return cached.products.filter(validCatalogProduct);}catch{}
    return furnitureCatalog.products;
  });
  useEffect(()=>{let active=true;api<{products:FurnitureProduct[]}>('furniture').then(value=>{if(active)setCatalogProducts(value.products);}).catch(()=>{});return()=>{active=false;};},[]);
  const [floor,setFloor]=useState(validPlan(initial?.payload.plan)?(initial!.payload.plan as Plan).elements.find(e=>e.id===initial?.payload.selectedFurniture)?.floor??0:0);
  const [drawing,setDrawing]=useState(false);
  const drawStart=useRef<{x:number;y:number}|null>(null);
  const [inside,setInside] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const entryId = useRef(initial?.id==='draft'?undefined:initial?.id);
  const drag = useRef<{plan:Plan; id:string; x:number; y:number}|null>(null);
  const selected = plan.elements.find(element => element.id === selection);
  const metrics=modelMetrics(plan);
  const dimensionsResult = {...rectangle(plan.width,plan.depth),area:metrics.area};
  const roomCount = plan.elements.filter(element => roomTypes.includes(element.type)).length;
  const wallLength=metrics.wallArea/plan.height;
  const furnishings=furnitureEstimate(plan);
  const rows = [
    ['Uy maydoni',fmt(dimensionsResult.area)+' m²'], ['Tashqi perimetr',fmt(dimensionsResult.perimeter)+' m'],
    ['Yer maydoni',fmt(plan.lotWidth*plan.lotDepth)+' m²'], ['Xonalar',String(roomCount)],
    ['Devor balandligi',fmt(plan.height)+' m'], ['Sof devor yuzasi',fmt(wallLength*plan.height)+' m²'],
    ['Devor hajmi',fmt(metrics.wallVolume)+' m³'], ['Yopma va ustun betoni',fmt(metrics.concreteVolume)+' m³'], ['Tom yuzasi',fmt(metrics.roofArea)+' m²'], ['Qavatlar',String(floorCount(plan))], ['Pol qoplamasi',fmt(dimensionsResult.area)+' m² (yalpi)'], ['Holat','Muhandis tasdig‘i talab etiladi'],
    ...furnishings.rows.flatMap(row=>[[row.name,String(row.quantity)+' dona'],[row.name+' birlik narxi',row.price===null?'Narx ko‘rsatilmagan':fmt(row.price)+' so‘m'],[row.name+' jami',row.total===null?'Narx ko‘rsatilmagan':fmt(row.total)+' so‘m']]),
    ['Mebel jami',fmt(furnishings.total)+' so‘m'+(furnishings.complete?'':' · to‘liq emas')],
  ];

  useEffect(() => {
    try {
      const previous=JSON.parse(localStorage.getItem(legacyDraftKey)??'null');
      if(validPlan(previous))setLegacy(previous);
    }catch{}
    {
      try {
        const data = JSON.parse(localStorage.getItem(draftKey) ?? (owner==='offline'?localStorage.getItem(legacyDraftKey):null) ?? 'null');
        if (validPlan(data)) setPlan(data);
      } catch {}
    }
    setReady(true);
  },[initial,draftKey,owner]);
  useEffect(() => {
    if (ready && validPlan(plan)) {
      try {localStorage.setItem(draftKey, JSON.stringify(plan));}
      catch {setMessage('Brauzer qoralamasini saqlab bo‘lmadi.');}
    }
  },[plan,ready,initial,draftKey]);

  function remember(previous:Plan) {
    setUndo(history => [...history.slice(-99),previous]);
    setRedo([]);
  }
  function commit(next:Plan) {
    next={...next,elements:next.elements.map(element=>{
      if(!element.furniture?.roomId)return element;
      const before=plan.elements.find(e=>e.id===element.furniture?.roomId);
      const after=next.elements.find(e=>e.id===element.furniture?.roomId);
      if(before&&after&&(before.x!==after.x||before.y!==after.y))return {...element,x:element.x+after.x-before.x,y:element.y+after.y-before.y};
      return element;
    })};
    if (!validPlan(next)) {setMessage('O‘lchamlar va elementlar uy yoki yer chegarasida bo‘lishi kerak.'); return;}
    const invalid=next.elements.find(element=>element.furniture&&furniturePlacementError(next,element));
    if(invalid){setMessage(furniturePlacementError(next,invalid)??'Mebel joylashuvi yaroqsiz.');return;}
    remember(plan);
    setPlan(next);
    setMessage('');
  }
  function history(back:boolean) {
    const past = back ? undo : redo;
    const next = past.at(-1);
    if (!next) return;
    if (back) {setUndo(past.slice(0,-1)); setRedo([...redo,plan]);}
    else {setRedo(past.slice(0,-1)); setUndo([...undo,plan]);}
    setPlan(next);
  }
  function add() {
    const sizes = type === 'Devor' ? [3,.15] : type === 'Eshik' ? [1,.18] : type === 'Deraza' ? [1.4,.16] : type === 'Panoramali oyna' ? [3,.18] : type === 'Balkon' ? [3,1.5] : type === 'Ustun' ? [.4,.4] : type === 'Zinapoya' ? [2.5,1] : type === 'Mebel' ? [1.5,.8] : [3,2.5];
    const element = {id:id(),type,floor,x:0,y:0,w:Math.min(plan.width,sizes[0]),d:Math.min(plan.depth,sizes[1])};
    commit({...plan,elements:[...plan.elements,element]});
    setSelection(element.id);
    setView('2d');
  }
  function editElement(key:keyof Pick<Element,'x'|'y'|'w'|'d'>,value:number) {
    commit({...plan,elements:plan.elements.map(element => element.id === selection ? {...element,[key]:value} : element)});
  }
  function move(event:React.PointerEvent<SVGSVGElement>) {
    const current = drag.current;
    if (!current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const moved={...current.plan,elements:current.plan.elements.map(element => element.id === current.id ? {
      ...element, x:Math.max(0,Math.min(plan.width-element.w,snap(element.x+(event.clientX-current.x)*plan.width/rect.width))),
      y:Math.max(0,Math.min(plan.depth-element.d,snap(element.y+(event.clientY-current.y)*plan.depth/rect.height))),
    } : element)};
    if(!moved.elements.some(e=>e.furniture&&furniturePlacementError(moved,e)))setPlan(moved);
  }
  async function openFile(file:File) {
    try {
      if (file.size > 500_000) throw new Error('JSON fayli 500 KB dan oshmasligi kerak.');
      const loaded = JSON.parse(await file.text());
      if (!validPlan(loaded)) throw new Error('JSON reja formati yoki o‘lchamlari yaroqsiz.');
      commit(loaded);
      setSelection('');
    } catch (error) {setMessage((error as Error).message);}
  }
  async function store(copy:boolean) {
    setBusy(true);
    try {
      const key = copy ? id() : entryId.current ?? id();
      await save('plan',copy ? 'Uy rejasi · nusxa' : 'Uy rejasi · '+fmt(plan.width)+' × '+fmt(plan.depth)+' m',rows,{plan},key);
      if (!copy) entryId.current = key;
      setMessage('');
    } catch (error) {setMessage((error as Error).message);}
    finally {setBusy(false);}
  }
  async function propose(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const suggestion = ai ? await api<unknown>('plan-suggestion',json('POST',{prompt})) : suggestPlan(prompt);
      if (!validPlan(suggestion)) throw new Error('Model taklifida reja parametrlari yoki chegaralari yaroqsiz.');
      commit(suggestion);
      setSelection('');
      setView('2d');
    } catch (error) {setMessage((error as Error).message);}
    finally {setBusy(false);}
  }
  function voice(text:string) {
    const normalized=text.toLowerCase();
    if(/divan|karavot|shkaf|stol|stul/.test(normalized)){commit(applyFurnitureVoice(plan,text,selection,floor,catalogProducts));return;}
    if(/qavat.*(qo.sh|yarat)/.test(normalized)){commit({...plan,floors:floorCount(plan)+1});return;}
    if(/(tom|devor).*(qora|oq)/.test(normalized)){
      const colors=plan.materials??{wall:palettes[plan.style][0],floor:palettes[plan.style][1],roof:palettes[plan.style][2],ceiling:'#e8e8f0'};
      commit({...plan,materials:{...colors,[normalized.includes('tom')?'roof':'wall']:normalized.includes('qora')?'#25252d':'#f4f4ef'}});return;
    }
    if(/deraza.*katta/.test(normalized)){
      if(!selected||!['Deraza','Panoramali oyna'].includes(selected.type))throw new Error('Avval derazani tanlang.');
      commit({...plan,elements:plan.elements.map(e=>e.id===selected.id?{...e,w:Math.min(e.w+.5,plan.width-e.x)}:e)});return;
    }
    const type=/deraza/.test(normalized)?'Deraza':/devor/.test(normalized)?'Devor':/xona/.test(normalized)?'Yotoqxona':null;
    if(type&&/(qo.sh|yarat)/.test(normalized)){
      const element={id:id(),type,floor,x:0,y:0,w:Math.min(type==='Deraza'?1.4:3,plan.width),d:Math.min(type==='Yotoqxona'?2.5:.15,plan.depth)};
      commit({...plan,elements:[...plan.elements,element]});setSelection(element.id);return;
    }
    throw new Error('Buyruq aniqlanmadi. Ko‘rsatilgan qisqa buyruqlardan foydalaning.');
  }
  return <>
    <PlannerVoice apply={voice}/><div className="split planner-grid">
      <section className="panel">
        <div className="toolbar"><button aria-pressed={view==='2d'} onClick={() => setView('2d')}><Grid2X2 size={16}/> 2D reja</button><button aria-pressed={view==='3d'} onClick={() => setView('3d')}><Box size={16}/> 3D ko‘rinish</button><button disabled={!undo.length} aria-label="Bekor qilish" onClick={() => history(true)}><Undo2 size={17}/></button><button disabled={!redo.length} aria-label="Qaytarish" onClick={() => history(false)}><Redo2 size={17}/></button>{view === '3d' && <button aria-pressed={inside} onClick={() => setInside(!inside)}>{inside ? 'Tashqaridan' : 'Ichkaridan'}</button>}</div>
        {view==='2d' ? <svg className="blueprint" style={{aspectRatio:plan.width/plan.depth,"--surface-ratio":plan.width/plan.depth} as React.CSSProperties} viewBox={['0','0',plan.width,plan.depth].join(' ')} preserveAspectRatio="none" onPointerDown={event=>{
            if(!drawing)return;
            const rect=event.currentTarget.getBoundingClientRect();
            drawStart.current={x:snap((event.clientX-rect.left)/rect.width*plan.width),y:snap((event.clientY-rect.top)/rect.height*plan.depth)};
            event.currentTarget.setPointerCapture(event.pointerId);
          }} onPointerMove={move} onPointerUp={event => {
            const start=drawStart.current;drawStart.current=null;
            if(start){const rect=event.currentTarget.getBoundingClientRect();const end={x:snap((event.clientX-rect.left)/rect.width*plan.width),y:snap((event.clientY-rect.top)/rect.height*plan.depth)};
              let x=Math.min(start.x,end.x),y=Math.min(start.y,end.y),w=Math.abs(end.x-start.x),d=Math.abs(end.y-start.y);
              if(type==='Devor'){if(w>=d){d=.15;}else{w=.15;}}
              w=Math.min(w,plan.width-x);d=Math.min(d,plan.depth-y);
              if(w>0&&d>0){const element={id:id(),type,floor,x,y,w,d};commit({...plan,elements:[...plan.elements,element]});setSelection(element.id);}
              return;
            }
            if(drag.current && drag.current.plan !== plan) remember(drag.current.plan);drag.current=null;}} onPointerCancel={() => {if(drag.current) setPlan(drag.current.plan);drag.current=null;}}>
          <defs><pattern id="grid" width=".5" height=".5" patternUnits="userSpaceOnUse"><path d="M .5 0 L 0 0 0 .5" fill="none" stroke="#354868" strokeWidth=".018"/></pattern></defs>
          <rect width={plan.width} height={plan.depth} fill="url(#grid)"/>
          {plan.elements.filter(element=>floorOf(element)===floor).map(element => <g key={element.id} transform={element.furniture?'rotate('+-element.furniture.rotation+' '+(element.x+element.w/2)+' '+(element.y+element.d/2)+')':undefined} tabIndex={0} role="button" aria-label={element.type} onKeyDown={event => {if (event.key==='Enter' || event.key===' ') {event.preventDefault();setSelection(element.id);}}} onPointerDown={event => {if(drawing)return;event.stopPropagation();event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);setSelection(element.id);drag.current={plan,id:element.id,x:event.clientX,y:event.clientY};}}>
            <rect x={element.x} y={element.y} width={element.w} height={element.d} fill={selection===element.id ? '#5f56be' : roomTypes.includes(element.type) ? '#293860' : '#408e9a'} stroke={selection===element.id ? '#c8b5ff' : '#7596d5'} strokeWidth=".035"/>
            {element.d > .45 && <text x={element.x+.1} y={element.y+.32} fontSize={Math.min(.28,element.w/Math.max(element.type.length,3))} fill="white">{element.type}</text>}
          </g>)}
        </svg> : <Scene plan={plan} inside={inside} floor={floor} selection={selection} onSelect={setSelection} onMove={(id,x,y)=>commit({...plan,elements:plan.elements.map(e=>e.id===id?{...e,x,y}:e)})}/>}
        <div className="toolbar"><button onClick={() => {commit({...initialPlan,elements:[]});setSelection('');}}>Bo‘sh reja</button><button onClick={() => download('usta-reja.json',new Blob([JSON.stringify(plan,null,2)],{type:'application/json'}))}>JSON eksport</button><button onClick={() => input.current?.click()}>JSON ochish</button><input hidden type="file" accept=".json,application/json" ref={input} onChange={event => {const file=event.target.files?.[0];if(file) void openFile(file);event.target.value='';}}/></div>
        {legacy&&<button onClick={()=>{commit(legacy);setSelection('');}}>Ushbu brauzerdagi eski qoralamani ochish</button>}
        <div className="summary-line"><span>{fmt(dimensionsResult.area)} m²</span><span>{fmt(dimensionsResult.perimeter)} m perimetr</span><span>{roomCount} xona</span><span>{fmt(metrics.wallVolume)} m³ devor</span><span>{fmt(metrics.concreteVolume)} m³ yopma/ustun</span><span>{fmt(metrics.roofArea)} m² tom</span></div>
      </section>
      <section className="panel">
        <h2>Reja parametrlari</h2>
        <label>Fasad materiali<select value={plan.wallFinish??'plaster'} onChange={event=>commit({...plan,wallFinish:event.target.value as Plan['wallFinish']})}><option value="plaster">Suvoq</option><option value="brick">G‘isht</option><option value="wood">Yog‘och</option><option value="concrete">Beton</option></select></label>
        <div className="toolbar"><label>Qavat<select value={floor} onChange={event=>setFloor(Number(event.target.value))}>{Array.from({length:floorCount(plan)},(_,index)=><option key={index} value={index}>{index+1}-qavat</option>)}</select></label><button disabled={floorCount(plan)>=20} onClick={()=>{const next=floorCount(plan);commit({...plan,floors:next+1});setFloor(next);}}>+ Qavat</button><button onClick={()=>{const next=floorCount(plan);commit({...plan,floors:next+1,elements:[...plan.elements,...plan.elements.filter(e=>floorOf(e)===floor).map(e=>({...e,id:id(),floor:next}))]});setFloor(next);}}>Qavat nusxasi</button></div>
        {floorCount(plan)>2&&<small>3+ qavat uchun muhandis va ekspertiza tekshiruvi zarur.</small>}
        <button aria-pressed={drawing} onClick={()=>{setDrawing(!drawing);setView('2d');}}>Rejada chizish</button>
        <div className="field-grid">{(Object.keys(dimensions) as (keyof typeof dimensions)[]).map(key => <label key={key}>{dimensions[key]}<input key={key+plan[key]} type="number" defaultValue={plan[key]} min=".1" max="200" step="any" onBlur={event => {const value=Number(event.target.value);if(value!==plan[key]) commit({...plan,[key]:value});event.target.value=String(validPlan({...plan,[key]:value})?value:plan[key]);}} onKeyDown={event => {if(event.key==='Enter') event.currentTarget.blur();}}/></label>)}</div>
        <div className="toolbar"><select aria-label="Dizayn uslubi" value={plan.style} onChange={event => commit({...plan,style:event.target.value})}>{Object.keys(palettes).map(style => <option key={style}>{style}</option>)}</select><label className="check"><input type="checkbox" checked={plan.roof} onChange={event => commit({...plan,roof:event.target.checked})}/> Tom</label></div>
        <div className="field-grid"><label>Tom shakli<select value={plan.roofShape??'flat'} onChange={event=>commit({...plan,roof:true,roofShape:event.target.value as Plan['roofShape']})}><option value="flat">Tekis</option><option value="gable">Ikki nishabli</option><option value="hip">To‘rt nishabli</option></select></label><label>Tom balandligi (m)<input type="number" min=".1" max="10" step=".1" value={plan.roofHeight??1.5} onChange={event=>commit({...plan,roofHeight:Number(event.target.value)})}/></label><label>Tom materiali<select value={plan.roofMaterial??'tile'} onChange={event=>commit({...plan,roofMaterial:event.target.value as Plan['roofMaterial']})}><option value="tile">Cherepitsa</option><option value="metal">Metall</option><option value="concrete">Beton</option></select></label></div>
        <label className="check"><input type="checkbox" checked={plan.ceiling??false} onChange={event=>commit({...plan,ceiling:event.target.checked})}/> Shift</label>
        <div className="field-grid">{(['wall','floor','roof','ceiling'] as const).map((key,index)=><label key={key}>{['Devor rangi','Pol rangi','Tom rangi','Shift rangi'][index]}<input type="color" value={plan.materials?.[key]??(key==='ceiling'?'#e8e8f0':palettes[plan.style][index])} onChange={event=>{
          const colors=plan.materials??{wall:palettes[plan.style][0],floor:palettes[plan.style][1],roof:palettes[plan.style][2],ceiling:'#e8e8f0'};
          commit({...plan,materials:{...colors,[key]:event.target.value}});
        }}/></label>)}</div>
        <div className="toolbar"><select aria-label="Element turi"  value={type} onChange={event => setType(event.target.value)}>{[...roomTypes,...objectTypes].map(option => <option key={option}>{option}</option>)}</select><button onClick={add}>+ Qo‘shish</button></div>
        {selected?.furniture&&<section className="placed-furniture-controls"><h3>{selected.furniture.name}</h3><label>Xona<select value={selected.furniture.roomId??''} onChange={event=>commit({...plan,elements:plan.elements.map(e=>e.id===selected.id?{...e,furniture:{...selected.furniture!,roomId:event.target.value||undefined}}:e)})}><option value="">Uy maydoni</option>{plan.elements.filter(e=>roomTypes.includes(e.type)&&floorOf(e)===floorOf(selected)).map(room=><option key={room.id} value={room.id}>{room.type} · {room.id.slice(0,4)}</option>)}</select></label>
          <label>Aylantirish (°)<input type="range" min="-180" max="180" step="15" value={selected.furniture.rotation} onChange={event=>commit({...plan,elements:plan.elements.map(e=>e.id===selected.id?{...e,furniture:{...selected.furniture!,rotation:Number(event.target.value)}}:e)})}/><span>{selected.furniture.rotation}°</span></label>
          <label>Material<select value={selected.furniture.material} onChange={event=>commit({...plan,elements:plan.elements.map(e=>e.id===selected.id?{...e,furniture:{...selected.furniture!,material:event.target.value}}:e)})}>{[...new Set([selected.furniture.material,'Mato','Yog‘och','Metall'])].map(value=><option key={value}>{value}</option>)}</select></label>
          <button onClick={()=>{
            try{const next=duplicateFurniture(plan,selected);const copy=next.elements.at(-1)!;commit(next);setSelection(copy.id);}catch(cause){setMessage((cause as Error).message);}
          }}>Mebeldan nusxa olish</button>
          <div className="field-grid">{([['left','Chap'],['right','O‘ng'],['back','Orqa'],['front','Old']] as const).map(([direction,label])=><button key={direction} onClick={()=>{try{commit(alignFurniture(plan,selected,direction));}catch(cause){setMessage((cause as Error).message);}}}>{label} devorga tekislash</button>)}</div>
          <small>O‘lchamlar modelning 50–150% chegarasida. To‘qnashuv bo‘lsa o‘zgarish qabul qilinmaydi.</small>
        </section>}
        {selected && <div className="element"><strong>{selected.type}</strong><div className="field-grid"><label>Qavat<select value={floorOf(selected)} onChange={event=>commit({...plan,elements:plan.elements.map(e=>e.id===selected.id?{...e,floor:Number(event.target.value)}:e)})}>{Array.from({length:floorCount(plan)},(_,index)=><option key={index} value={index}>{index+1}</option>)}</select></label><label>Balandlik (m)<input type="number" min=".1" max={plan.height} step=".1" value={selected.height??(['Deraza'].includes(selected.type)?1.2:selected.type==='Eshik'?2.1:selected.type==='Panoramali oyna'?2.4:plan.height)} onChange={event=>commit({...plan,elements:plan.elements.map(e=>e.id===selected.id?{...e,height:Number(event.target.value)}:e)})}/></label><label>Rang<input type="color" value={selected.color??'#d9d9df'} onChange={event=>commit({...plan,elements:plan.elements.map(e=>e.id===selected.id?{...e,color:event.target.value}:e)})}/></label></div><div className="field-grid">{(['x','y','w','d'] as const).map((key,index) => <label key={key}>{['X (m)','Y (m)','Uzunlik (m)','Kenglik (m)'][index]}<input key={selected.id+key+selected[key]} type="number" step="any" min="0" defaultValue={selected[key]} onBlur={event => {const value=Number(event.target.value);if(value!==selected[key]) editElement(key,value);event.target.value=String(value===selected[key]?value:selected[key]);}} onKeyDown={event => {if(event.key==='Enter') event.currentTarget.blur();}}/></label>)}</div><button onClick={() => {commit({...plan,elements:plan.elements.filter(element => element.id !== selection)});setSelection('');}}>Elementni o‘chirish</button></div>}
        <div className="toolbar"><button className="primary" disabled={busy} onClick={() => store(false)}>Saqlash</button><button disabled={busy} onClick={() => store(true)}>Nusxa saqlash</button></div>
        {message && <p role="status">{message}</p>}
      </section>
    </div>
    {furnishings.rows.length>0&&<section className="panel furniture-estimate"><h2>Mebel smetasi</h2><table><thead><tr><th>Mebel</th><th>Dona</th><th>Birlik narxi</th><th>Jami</th></tr></thead><tbody>{furnishings.rows.map((row,index)=><tr key={row.id+index}><td>{row.name}</td><td>{row.quantity}</td><td>{row.price===null?'Ko‘rsatilmagan':fmt(row.price)}</td><td>{row.total===null?'—':fmt(row.total)}</td></tr>)}</tbody></table><p>Jami {fmt(furnishings.total)} so‘m{furnishings.complete?'':' · narxlar to‘liq emas'}</p><button onClick={()=>window.print()}>PDF / chop etish</button></section>}
    <section className="panel assistant"><h2>Matndan reja taklifi</h2>
      <form onSubmit={propose}><div className="toolbar"><input aria-label="Uy tavsifi" placeholder="12×8 metr, 3 xona, oshxona va hammom" value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={400} required/><button type="submit" disabled={busy}>{busy ? 'Kutilmoqda…' : 'Reja tuzish'}</button></div>
        <label className="check"><input type="checkbox" checked={ai} onChange={event => setAI(event.target.checked)}/> Mahalliy AI modelidan foydalanish</label>
      </form><p>Dastlabki reja. Muhandis tasdig‘i kerak.</p>
    </section>
  </>;
}


