'use client';

import {useEffect, useRef, useState} from 'react';
import {Camera, ImagePlus, ScanLine} from 'lucide-react';
import {detectPhotoRegions,detectRegions} from './vision.mjs';
import {countMaterials, polygon, rectangle} from './domain.mjs';
import {api, fmt, id, type Entry, type Item, type Point, type Save} from './shared';

const materials = ['Belgi / predmet','Shifer','Taxta','Brus','G‘isht','Blok','Quvur','Boshqa'];
type Calibration = 'contour' | 'reference';

export function CameraTool({mode,initial,save}: {mode:'measurement'|'materials'; initial?:Entry; save:Save}) {
  const measure = mode === 'measurement';
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(true);
  const upload = useRef<HTMLInputElement>(null);
  const nativeCapture = useRef<HTMLInputElement>(null);
  const drag = useRef<number|null>(null);
  const boxStart = useRef<Point|null>(null);
  const entryId = useRef(initial?.id);
  const [countMode,setCountMode]=useState<'materials'|'marks'>('materials');
  const [countReady,setCountReady]=useState(Boolean(initial?.payload.items));
  const [automatic,setAutomatic]=useState(true);
  const [manual,setManual] = useState(false);
  const [threshold,setThreshold] = useState(150);
  const [minimum,setMinimum] = useState(40);
  const [light,setLight] = useState(false);
  const [measureMethod,setMeasureMethod] = useState<'dimensions'|'photo'>(initial?.payload.measureMethod === 'photo' ? 'photo' : 'dimensions');
  const [length,setLength] = useState(Number(initial?.payload.length) || 0);
  const [width,setWidth] = useState(Number(initial?.payload.width) || 0);
  const [live,setLive] = useState(false);
  const [image,setImage] = useState('');
  const [photo,setPhoto] = useState<Blob>();
  const [ratio,setRatio] = useState(Number(initial?.payload.ratio) || 1.5);
  const [points,setPoints] = useState<Point[]>((initial?.payload.points as Point[]) ?? []);
  const [reference,setReference] = useState<Point[]>((initial?.payload.reference as Point[]) ?? []);
  const [items,setItems] = useState<Item[]>((initial?.payload.items as Item[]) ?? []);
  const [target,setTarget] = useState<Calibration>('contour');
  const [distance,setDistance] = useState(Number(initial?.payload.distance) || 0);
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);
  const [uncertain,setUncertain] = useState(Boolean(initial?.payload.uncertain));
  const actual = (point:Point) => ({x:point.x * ratio,y:point.y});
  const base = reference.length === 2 ? Math.hypot((reference[0].x-reference[1].x)*ratio, reference[0].y-reference[1].y) : 0;
  const scale = base > 0 ? distance / base : 0;
  const result = measureMethod === 'dimensions' ?
    (length > 0 && width > 0 ? {...rectangle(length,width),sides:[length,width,length,width]} : null)
    : polygon(points.map(actual), scale);
  const counts = countMaterials(items);
  const total = Object.values(counts).reduce((sum,value) => sum + value,0);

  useEffect(() => {
    mounted.current = true;
    return () => {mounted.current = false; stream.current?.getTracks().forEach(track => track.stop());};
  }, []);
  useEffect(() => {
    if (live && video.current) video.current.srcObject = stream.current;
  }, [live]);
  useEffect(() => () => {if (image) URL.revokeObjectURL(image);}, [image]);

  function stop() {
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    setLive(false);
  }
  async function start() {
    setBusy(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Kamera uchun HTTPS yoki localhost kerak.');
      const camera = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      if (!mounted.current) {camera.getTracks().forEach(track => track.stop()); return;}
      stream.current = camera;
      setLive(true);
      setMessage('');
    } catch (error) {
      setMessage((error as Error).name === 'NotAllowedError' ? 'Kamera ruxsati berilmadi. Brauzer sozlamasini tekshiring yoki rasm yuklang.' : (error as Error).message);
    } finally {setBusy(false);}
  }
  function localAnalysis(bitmap: ImageBitmap, contours = false) {
    const canvas = document.createElement('canvas');
    const factor = Math.min(1, 1000 / Math.max(bitmap.width,bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width*factor));
    canvas.height = Math.max(1, Math.round(bitmap.height*factor));
    const context = canvas.getContext('2d',{willReadFrequently:true});
    if (!context) throw new Error('Rasmni tahlil qilib bo‘lmadi.');
    context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
    const regions=automatic?detectPhotoRegions(pixels,canvas.width,canvas.height,minimum):
      detectRegions(pixels,canvas.width,canvas.height,threshold,light,minimum);
    if (regions.length > 500) throw new Error('Kadrda juda ko‘p mayda belgi bor. Eng kichik belgi qiymatini oshiring.');
    if (contours) {
      const largest = regions.sort((a,b)=>b.w*b.h-a.w*a.h)[0];
      if (!largest) throw new Error('Chegara topilmadi. Kontrastni o‘zgartiring yoki burchaklarni belgilang.');
      const {x,y,w,h} = largest;
      setPoints([{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}]);
      setMeasureMethod('photo');
      setMessage('Eng katta shaklning to‘rtburchak chegarasi belgilandi. Burchaklarni tekshiring va masshtab kiriting.');
    } else {
      setCountReady(true);
      setItems(regions.map(region=>({...region,id:id(),type:materials[0],pieces:1})));
      setUncertain(true);
      setMessage(regions.length ? regions.length+' ta alohida kontur topildi. Raqamlar kadrda ko‘rsatilgan.' :
        'Alohida kontur topilmadi. Yorug‘lik va kontrastni o‘zgartirib qayta tahlil qiling.');
    }
  }
  async function reanalyze() {
    if (!photo) return;
    if(!measure&&countMode==='materials'){await analyze();return;}
    setBusy(true);
    let bitmap: ImageBitmap | undefined;
    try {bitmap = await createImageBitmap(photo);localAnalysis(bitmap,measure);}
    catch(error) {setMessage((error as Error).message);}
    finally {bitmap?.close();setBusy(false);}
  }
  async function load(file:Blob) {
    if (file.size > 25_000_000 || !['image/jpeg','image/png','image/webp'].includes(file.type)) {
      setMessage('25 MB gacha JPEG, PNG yoki WebP yuklang.');
      return;
    }
    setBusy(true);
    let bitmap: ImageBitmap | undefined;
    try {
      bitmap = await createImageBitmap(file,{resizeWidth:1280,resizeQuality:'medium'});
      setRatio(bitmap.width / bitmap.height);

      const normalized = document.createElement('canvas');
      const resize = Math.min(1,2000/Math.max(bitmap.width,bitmap.height));
      normalized.width=Math.max(1,Math.round(bitmap.width*resize));
      normalized.height=Math.max(1,Math.round(bitmap.height*resize));
      const context=normalized.getContext('2d');
      if (!context) throw new Error('Rasm tayyorlanmadi.');
      context.drawImage(bitmap,0,0,normalized.width,normalized.height);
      const compact = await new Promise<Blob|null>(resolve=>normalized.toBlob(resolve,'image/jpeg',.88));
      if (!compact) throw new Error('Rasmni tayyorlab bo‘lmadi.');
      setPhoto(compact);
      setImage(URL.createObjectURL(compact));
      setPoints([]);
      setReference([]);
      setItems([]);
      setMessage('');
      stop();
      if (!measure) {
        setCountReady(false);
        if(countMode==='marks')localAnalysis(bitmap);
        else await detectMaterials(compact);
      }
    } catch(error) {setMessage('Rasmni ochib bo‘lmadi. '+(error as Error).message);}
    finally {bitmap?.close();setBusy(false);}
  }
  function capture() {
    const source = video.current;
    if (!source?.videoWidth) {setMessage('Kamera tasviri hali tayyor emas.'); return;}
    const canvas = document.createElement('canvas');
    canvas.width = source.videoWidth;
    canvas.height = source.videoHeight;
    canvas.getContext('2d')?.drawImage(source,0,0);
    canvas.toBlob(blob => {if (blob) void load(blob);},'image/jpeg',.9);
  }
  async function detectMaterials(blob:Blob) {
    const data=new FormData();data.append('image',blob,'kadr.jpg');
    try {
      const detected=await api<Omit<Item,'id'>[]>('detect',{method:'POST',body:data});
      setItems(detected.map(item=>({...item,id:id()})));
      setCountReady(true);setUncertain(true);
      setMessage(detected.length?'AI aniqlagan predmetlarni tekshiring.':'AI ushbu suratda qurilish materialini topmadi.');
    }catch(error){
      setItems([]);setCountReady(false);
      setMessage('Material sanalmadi. AI modeli ulanmagan. '+(error as Error).message);
    }
  }
  async function analyze() {
    if (!photo) return;
    setBusy(true);
    setMessage('');
    if(!measure){try{await detectMaterials(photo);}finally{setBusy(false);}return;}
    const data = new FormData();
    data.append('image',photo,'kadr');
    try {
      if (measure) {
        setPoints(await api<Point[]>('corners',{method:'POST',body:data}));
        setMessage('Kontur taklif qilindi. Burchaklarni tekshiring.');
      } else {
        const detected = await api<Omit<Item,'id'>[]>('detect',{method:'POST',body:data});
        setItems(detected.map(item => ({...item,id:id()})));
        setUncertain(true);
        setMessage(detected.length ? 'Aniqlangan predmetlarni tekshiring. Yopilgan donalarni qo‘lda kiriting.' : 'Model predmet topmadi. Qo‘lda qo‘shish mumkin.');
      }
    } catch (error) {setMessage((error as Error).message);}
    finally {setBusy(false);}
  }
  const selectedPoints = target === 'contour' ? points : reference;
  const updatePoints = target === 'contour' ? setPoints : setReference;
  function coords(event: React.PointerEvent<SVGSVGElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return {x:Math.min(1,Math.max(0,(event.clientX-rect.left)/rect.width)),y:Math.min(1,Math.max(0,(event.clientY-rect.top)/rect.height))};
  }
  function down(event: React.PointerEvent<SVGSVGElement>) {
    if ((!measure && !manual) || live) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = coords(event);
    if (!measure) {boxStart.current = point; return;}
    const nearest = selectedPoints.findIndex(other => Math.hypot(other.x-point.x,other.y-point.y)<.035);
    if (nearest >= 0) {drag.current = nearest; return;}
    if (target === 'reference' && reference.length >= 2) {setReference([point]); drag.current = 0; return;}
    drag.current = selectedPoints.length;
    updatePoints([...selectedPoints, point]);
  }
  function move(event: React.PointerEvent<SVGSVGElement>) {
    const index = drag.current;
    if (index === null) return;
    updatePoints(previous => previous.map((point,i) => i === index ? coords(event) : point));
  }
  function up(event: React.PointerEvent<SVGSVGElement>) {
    drag.current = null;
    const start = boxStart.current;
    boxStart.current = null;
    if (!start) return;
    const end = coords(event);
    const w = Math.abs(start.x-end.x), h = Math.abs(start.y-end.y);
    if (w >= .005 && h >= .005) setItems(previous => [...previous,{id:id(),type:materials[0],pieces:1,x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),w,h}]);
  }

  const rows = measure ? [
    ['Maydon',fmt(result?.area ?? 0)+' m²'],['Perimetr',fmt(result?.perimeter ?? 0)+' m'],
    ...((result?.sides ?? []).map((side,index) => ['Tomon '+(index+1),fmt(side)+' m'])),
    ['Usul',measureMethod==='dimensions'?'Kiritilgan uzunlik × kenglik':'Rasmdan kalibrlangan'],['Kalibrlash',measureMethod==='dimensions'?'Qo‘lda kiritilgan o‘lcham':fmt(distance)+' m'],['Holat',measureMethod==='dimensions'?'Kiritilgan o‘lchamlar asosida':'Bir tekislikdagi rasm bo‘yicha taxminiy o‘lchov'],
  ] : [...Object.entries(counts).map(([type,value]) => [type,fmt(value)+' dona']),['Jami',fmt(total)+' dona'],['Holat',uncertain ? 'Taxminiy, yashirin donalar qo‘lda tekshiriladi' : 'Qo‘lda sanalgan']];
  async function store() {
    setBusy(true);
    try {
      entryId.current ??= id();
      await save(mode,measure ? 'Maydon o‘lchovi' : 'Materiallar soni',rows,{points,reference,distance,ratio,items,uncertain,length,width,measureMethod},entryId.current);
      setMessage('');
    } catch (error) {setMessage((error as Error).message);}
    finally {setBusy(false);}
  }

  return <div className={'split camera-grid'+(measure?' measurement-grid':'')}>
    <section className="panel">
      <div className="toolbar">
        <button disabled={busy || live} onClick={start}><Camera size={16}/> Kamera</button>
        {live && <><button onClick={capture}>Kadr olish</button><button onClick={stop}>To‘xtatish</button></>}
        <button disabled={busy} onClick={() => nativeCapture.current?.click()}>Rasm olish</button>
        <input hidden ref={nativeCapture} type="file" accept="image/*" capture="environment" onChange={event=>{const file=event.target.files?.[0];if(file) void load(file);event.target.value='';}}/>
        <button disabled={busy} onClick={() => upload.current?.click()}><ImagePlus size={16}/> Rasm yuklash</button>
        <input hidden type="file" accept="image/jpeg,image/png,image/webp" ref={upload} onChange={event => {const file = event.target.files?.[0]; if (file) void load(file); event.target.value = '';}}/>
        <button disabled={!photo || busy || live} onClick={reanalyze}><ScanLine size={16}/> {busy ? 'Tahlil qilinmoqda…' : measure ? 'Kontur topish' : countMode==='materials'?'AI bilan sanash':'Belgilarni ajratish'}</button>
        
      </div>
      {live ? <div className="camera-live"><video className="video" ref={video} autoPlay muted playsInline/><button className="primary shutter" disabled={busy} onClick={capture}><Camera size={22}/> Rasm olish</button></div> : <div className="viewport" style={{aspectRatio:ratio,"--surface-ratio":ratio} as React.CSSProperties}>
        {image && <img src={image} alt="Tahlil qilinayotgan kadr" draggable={false}/>}
        {!image && !points.length && !items.length && <div className="viewport-hint"><ScanLine size={32}/><span>Kamerani oching yoki rasm yuklang</span></div>}
        <svg aria-label={measure ? 'O‘lchov konturi' : 'Material belgilari'} viewBox="0 0 100 100" preserveAspectRatio="none" style={{touchAction:measure || manual ? 'none' : 'pan-y'}} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => {drag.current=null; boxStart.current=null;}}>
          {measure ? <>
            <polygon points={points.map(p => [p.x*100,p.y*100].join(',')).join(' ')} className="outline"/>
            {reference.length === 2 && <line x1={reference[0].x*100} y1={reference[0].y*100} x2={reference[1].x*100} y2={reference[1].y*100} className="reference"/>}
            {[...points,...reference].map((p,i) => <circle key={i} cx={p.x*100} cy={p.y*100} r="1.25" className={i<points.length?'corner':'reference-point'}/>)}
          </> : items.map((item,index) => item.w > 0 && <g key={item.id}><rect x={item.x*100} y={item.y*100} width={item.w*100} height={item.h*100} className="bbox"/><text x={item.x*100+1} y={item.y*100+4}>{index+1}</text></g>)}
        </svg>
      </div>}
      {message && <p role="status" className="inline-message">{message}</p>}
    </section>
    <section className="panel camera-result">
      <h2>{measure ? 'Kalibrlash va natija' : 'Predmetlar va natija'}</h2>
      {measure ? <>
        <div className="measurement-summary" role="status">{result?<><strong>{fmt(result.area)} m²</strong><span>{fmt(result.perimeter)} m perimetr</span></>:<span>{measureMethod==='dimensions'?'Maydon uchun uzunlik va kenglikni kiriting.':'Suratda metr hisoblash uchun ma’lum masofani kiriting.'}</span>}</div>
        <div className="toolbar"><button aria-pressed={measureMethod==='dimensions'} onClick={()=>setMeasureMethod('dimensions')}>Uzunlik × kenglik</button><button aria-pressed={measureMethod==='photo'} onClick={()=>setMeasureMethod('photo')}>Rasm bo‘yicha</button></div>
        {measureMethod==='dimensions' ? <div className="field-grid"><label>Uzunlik (m)<input inputMode="decimal" type="text" min="0" step="any" value={length||''} onChange={event=>setLength(Number(event.target.value.replace(',','.')))}/></label><label>Kenglik (m)<input inputMode="decimal" type="text" min="0" step="any" value={width||''} onChange={event=>setWidth(Number(event.target.value.replace(',','.')))}/></label></div> : <>
        <div className="toolbar"><button aria-pressed={target==='contour'} onClick={() => setTarget('contour')}>Kontur</button><button aria-pressed={target==='reference'} onClick={() => setTarget('reference')}>Masshtab chizig‘i</button><button onClick={() => updatePoints(selectedPoints.slice(0,-1))}>Oxirgi nuqtani olib tashlash</button><button onClick={() => {setPoints([]); setReference([]); setDistance(0);}}>Qayta boshlash</button></div>
        <button disabled={points.length<2} onClick={()=>{setReference(points.slice(0,2));setTarget('reference');}}>1-tomon masshtabi</button>
        <label>Ikki tayanch nuqta orasidagi masofa (m)<input type="number" min="0" step="any" value={distance || ''} onChange={event => setDistance(Number(event.target.value.replace(',','.')))}/></label>
        {!result && <p>Burchaklarni belgilang va tayanch masofani kiriting.</p>}
        </>}
        {!result && measureMethod==='dimensions' && <p>Uzunlik va kenglikni kiriting.</p>}
      </> : <>
        <label className="check"><input type="checkbox" checked={automatic} onChange={event=>setAutomatic(event.target.checked)}/> Fon bo‘yicha ajratish</label>
        <label>Sanash usuli<select value={countMode} onChange={event=>{setCountMode(event.target.value as 'materials'|'marks');setItems([]);setCountReady(false);setMessage('Usul o‘zgardi. Rasmni qayta tahlil qiling.');}}><option value="materials">Qurilish materiallari — AI modeli</option><option value="marks">Oddiy belgilar — kontur tahlili</option></select></label>
        <strong className="count-total" aria-live="polite">{countReady||items.length?'Jami: '+total+' dona':'Sanoq hali bajarilmadi'}</strong>
        <div className="field-grid"><label>Ajratish chegarasi<input type="range" min="20" max="240" value={threshold} onChange={event=>setThreshold(Number(event.target.value.replace(',','.')))}/><span>{threshold}</span></label><label>Eng kichik belgi (piksel)<input type="number" min="2" max="10000" value={minimum} onChange={event=>setMinimum(Math.max(2,Math.min(10000,Number(event.target.value.replace(',','.')))))}/></label></div>
        <label className="check"><input type="checkbox" checked={light} onChange={event=>setLight(event.target.checked)}/> Qorong‘i fondagi yorug‘ belgilar</label>
        <button disabled={!photo || busy} onClick={reanalyze}>Sozlamalar bilan qayta sanash</button>
        <label className="check"><input type="checkbox" checked={manual} onChange={event=>setManual(event.target.checked)}/> Qo‘lda ramka qo‘shishni yoqish</label>
        <button onClick={() => setItems([...items,{id:id(),type:materials[0],pieces:1,x:0,y:0,w:0,h:0}])}>+ Predmet yoki to‘plam</button>
        {items.map((item,index) => <div className="item" key={item.id}><span>#{index+1}</span><select aria-label={'Predmet '+(index+1)+' turi'} value={item.type} onChange={event => setItems(previous => previous.map(row => row.id === item.id ? {...row,type:event.target.value} : row))}>{materials.map(type => <option key={type}>{type}</option>)}</select><input aria-label={'Predmet '+(index+1)+' dona soni'} type="number" min="1" max="100000" value={item.pieces} onChange={event => setItems(previous => previous.map(row => row.id === item.id ? {...row,pieces:Math.min(100000,Math.max(1,Math.trunc(Number(event.target.value.replace(',','.')))))} : row))}/><button aria-label={'Predmet '+(index+1)+' ni o‘chirish'} onClick={() => setItems(previous => previous.filter(row => row.id!==item.id))}>×</button>{item.confidence !== undefined && <small>AI {item.confidence}%</small>}</div>)}
        <label className="check"><input type="checkbox" checked={uncertain} onChange={event => setUncertain(event.target.checked)}/> Natija taxminiy</label>
      </>}
      {(measure ? result : items.length > 0) && <><table><tbody>{rows.map(([key,value],index) => <tr key={index}><th scope="row">{key}</th><td>{value}</td></tr>)}</tbody></table><button className="primary" disabled={busy} onClick={store}>Natijani saqlash</button></>}
    </section>
  </div>;
}

