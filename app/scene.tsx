'use client';
import {Component,useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useThree,type ThreeEvent} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {Walk} from './walk';
import {StudioEnvironment} from './furniture-lighting';
import {LoadedFurniture,ModelLoading} from './furniture-model';
import {CanvasTexture,RepeatWrapping,BoxGeometry,BufferGeometry,Float32BufferAttribute,Group,Vector3} from 'three';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
import {palettes} from './domain.mjs';
import {floorCount,floorOf,wallPieces,wallSegments} from './house-model.mjs';
import {download,type Plan,type Element} from './shared';

class SceneBoundary extends Component<{children:React.ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<p role="alert">3D ochilmadi. 2D rejadan foydalaning.</p>:this.props.children;}
}
type Props={plan:Plan;inside:boolean;floor?:number;selection?:string;onSelect?:(id:string)=>void;onMove?:(id:string,x:number,y:number)=>void};
function Setup({plan,inside,floor,bind}:{plan:Plan;inside:boolean;floor:number;bind:(canvas:HTMLCanvasElement)=>void}){
 const {camera,gl}=useThree();
 useEffect(()=>{bind(gl.domElement);},[gl,bind]);
 useEffect(()=>{const base=floor*plan.height;const extent=Math.max(plan.width,plan.depth,plan.height*floorCount(plan));camera.position.set(inside?plan.width*.3:plan.width/2+extent*1.8,inside?base+1.6:plan.height*floorCount(plan)/2+extent*1.4,inside?plan.depth*.3:plan.depth/2+extent*1.8);camera.lookAt(plan.width/2,inside?base+1.6:plan.height*floorCount(plan)/2,plan.depth/2);},[camera,inside,floor,plan.width,plan.depth,plan.height,plan.floors]);
 return null;
}
function roofGeometry(plan:Plan){
 const w=plan.width+.4,d=plan.depth+.4,h=plan.roofHeight??1.5;
 if((plan.roofShape??'flat')==='flat')return new BoxGeometry(w,.2,d);
 const x=w/2,z=d/2;
 const vertices=(plan.roofShape==='hip')?
  [-x,0,-z,x,0,-z,0,h,0, x,0,-z,x,0,z,0,h,0, x,0,z,-x,0,z,0,h,0, -x,0,z,-x,0,-z,0,h,0, -x,0,-z,-x,0,z,x,0,z,-x,0,-z,x,0,z,x,0,-z]:
  [-x,0,-z,x,0,-z,0,h,-z, -x,0,z,0,h,z,x,0,z, -x,0,-z,0,h,-z,0,h,z,-x,0,-z,0,h,z,-x,0,z, x,0,-z,x,0,z,0,h,z,x,0,-z,0,h,z,0,h,-z, -x,0,-z,-x,0,z,x,0,z,-x,0,-z,x,0,z,x,0,-z];
 for(let i=0;i<vertices.length;i+=9){
  const a=new Vector3(vertices[i],vertices[i+1],vertices[i+2]);
  const b=new Vector3(vertices[i+3],vertices[i+4],vertices[i+5]);
  const c=new Vector3(vertices[i+6],vertices[i+7],vertices[i+8]);
  const normal=b.clone().sub(a).cross(c.clone().sub(a));
  const outward=a.clone().add(b).add(c).multiplyScalar(1/3).sub(new Vector3(0,h/4,0));
  if(normal.dot(outward)<0)for(let coordinate=0;coordinate<3;coordinate++){
    const previous=vertices[i+3+coordinate];vertices[i+3+coordinate]=vertices[i+6+coordinate];vertices[i+6+coordinate]=previous;
  }
 }
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();return geometry;
}
export default function Scene({plan,inside,floor=0,selection,onSelect,onMove}:Props){
 const [modelError,setModelError]=useState('');
 const [readyModels,setReadyModels]=useState<string[]>([]);
 const [direction,setDirection]=useState(''),[canvas,setCanvas]=useState<HTMLCanvasElement>();
 const [moving,setMoving]=useState(false);
 const model=useRef<Group>(null),drag=useRef<{id:string;point:Vector3;original:Element}|null>(null);
 const defaults=palettes[plan.style],wallColor=plan.materials?.wall??defaults[0],floorColor=plan.materials?.floor??defaults[1],roofColor=plan.materials?.roof??defaults[2];
 const wallTexture=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#eeeeee';ctx.fillRect(0,0,256,256);
  const finish=plan.wallFinish??'plaster';
  ctx.strokeStyle=finish==='brick'?'#91847a':'#c4c0b9';ctx.lineWidth=finish==='brick'?4:1;
  if(finish==='brick')for(let row=0;row<8;row++){
    ctx.beginPath();ctx.moveTo(0,row*32);ctx.lineTo(256,row*32);ctx.stroke();
    for(let x=(row%2)*32;x<256;x+=64){ctx.beginPath();ctx.moveTo(x,row*32);ctx.lineTo(x,row*32+32);ctx.stroke();}
  }
  if(finish==='wood')for(let x=0;x<256;x+=16){ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+6,80,x-4,180,x+2,256);ctx.stroke();}
  if(finish==='concrete'||finish==='plaster')for(let i=0;i<1500;i++){ctx.fillStyle=i%2?'#ffffff28':'#49494912';ctx.fillRect((i*73)%256,(i*127)%256,2,2);}
  const texture=new CanvasTexture(canvas);texture.wrapS=texture.wrapT=RepeatWrapping;return texture;
 },[plan.wallFinish]);
 useEffect(()=>()=>wallTexture.dispose(),[wallTexture]);
 const roof=useMemo(()=>roofGeometry(plan),[plan]);
 useEffect(()=>()=>roof.dispose(),[roof]);
 function down(event:ThreeEvent<PointerEvent>,id:string){
  event.stopPropagation();onSelect?.(id);
  const original=plan.elements.find(e=>e.id===id);
  if(original&&onMove&&!inside){drag.current={id,point:event.point.clone(),original};setMoving(true);}
 }
 function up(event:ThreeEvent<PointerEvent>){
  const current=drag.current;drag.current=null;setMoving(false);
  if(!current||!onMove)return;
  const dx=event.point.x-current.point.x,dz=event.point.z-current.point.z;
  if(Math.hypot(dx,dz)<.05)return;
  onMove(current.id,Math.max(0,Math.min(plan.width-current.original.w,Math.round((current.original.x+dx)*4)/4)),Math.max(0,Math.min(plan.depth-current.original.d,Math.round((current.original.y+dz)*4)/4)));
 }
 function block(key:string,at:[number,number,number],size:[number,number,number],color:string,id?:string,glass=false,textured=false){
  return <mesh key={key} position={at} castShadow={!glass} receiveShadow onPointerDown={id?event=>down(event,id):undefined}><boxGeometry args={size}/><meshStandardMaterial map={textured?wallTexture:undefined} color={id===selection?'#b6a2df':color} roughness={glass?.08:.65} metalness={glass?.15:plan.roofMaterial==='metal'?.5:.04} transparent={glass} opacity={glass?.38:1}/></mesh>;
 }
 return <SceneBoundary><div className="scene" data-models-ready={plan.elements.every(e=>!e.furniture||readyModels.includes(e.furniture.modelUrl))} style={{height:'min(65svh,620px)',minHeight:320}}>
  <Canvas shadows dpr={[1,1.5]} gl={{preserveDrawingBuffer:true}} camera={{fov:50,near:.04,far:2000}} onPointerUp={()=>{drag.current=null;setMoving(false);}}>
   <color attach="background" args={['#172237']}/><ambientLight intensity={1.2}/><hemisphereLight args={['#ddeaff','#45523d',1.4]}/><directionalLight position={[14,25,10]} intensity={3} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40}/>
   {plan.elements.some(e=>e.furniture)&&<StudioEnvironment/>}
   <Setup plan={plan} inside={inside} floor={floor} bind={setCanvas}/><Walk inside={inside} direction={direction}/>
   <OrbitControls key={inside+'-'+floor} enabled={!moving} target={[plan.width/2,inside?floor*plan.height+1.6:plan.height*floorCount(plan)/2,plan.depth/2]} makeDefault minDistance={.2} maxDistance={700}/>
   <mesh rotation={[-Math.PI/2,0,0]} position={[plan.width/2,-.16,plan.depth/2]} receiveShadow onPointerUp={up}><planeGeometry args={[plan.lotWidth,plan.lotDepth]}/><meshStandardMaterial color="#46664b"/></mesh>
   <group ref={model} onPointerUp={up}>
    {Array.from({length:floorCount(plan)},(_,level)=>block('slab'+level,[plan.width/2,level*plan.height-.08,plan.depth/2],[plan.width,.16,plan.depth],floorColor))}
    {wallSegments(plan).flatMap(wall=>wallPieces(plan,wall).map((piece,index)=>block(wall.id+'-'+index,[piece.x+piece.w/2,piece.y+piece.h/2,piece.z+piece.d/2],[piece.w,piece.h,piece.d],piece.color??wallColor,piece.owner,false,true)))}
    {plan.elements.filter(e=>!['Devor','Yotoqxona','Oshxona','Zal','Hammom','Koridor'].includes(e.type)).map(element=>{
     const {id,x,y,w,d,type}=element,base=floorOf(element)*plan.height;
     if(element.furniture){
       const product=element.furniture;
       return <group key={id} position={[x+w/2,base,y+d/2]} rotation={[0,product.rotation*Math.PI/180,0]} scale={[w/product.dimensions.width,(element.height??product.dimensions.height)/product.dimensions.height,d/product.dimensions.depth]} onPointerDown={event=>down(event,id)}>
         <LoadedFurniture onError={setModelError} onReady={()=>setReadyModels(previous=>previous.includes(product.modelUrl)?previous:[...previous,product.modelUrl])} url={product.modelUrl} dimensions={product.dimensions} color={element.color} material={product.material}/>
       </group>;
     }
     if(type==='Deraza'||type==='Panoramali oyna'||type==='Eshik'){
      const height=element.height??(type==='Eshik'?2.1:type==='Panoramali oyna'?2.4:1.2),sill=type==='Eshik'?0:element.sill??(type==='Panoramali oyna'?.2:1);
      return <group key={id}>{block(id,[x+w/2,base+sill+height/2,y+d/2],[w,height,d],type==='Eshik'?'#95744f':'#88d4ee',id,type!=='Eshik')}{block(id+'-frame',[x+w/2,base+sill+height,y+d/2],[w+.06,.06,d+.035],'#d9e3e9',id)}</group>;
     }
     if(type==='Zinapoya'){const steps=Math.max(3,Math.round(plan.height/.175));return <group key={id}>{Array.from({length:steps},(_,i)=>block(id+i,[x+(i+.5)*w/steps,base+(i+1)*plan.height/steps/2,y+d/2],[w/steps,(i+1)*plan.height/steps,d],element.color??'#b5a791',id))}</group>;}
     if(type==='Ustun')return <mesh key={id} position={[x+w/2,base+(element.height??plan.height)/2,y+d/2]} castShadow onPointerDown={event=>down(event,id)}><cylinderGeometry args={[Math.min(w,d)/2,Math.min(w,d)/2,element.height??plan.height,24]}/><meshStandardMaterial color={element.color??wallColor}/></mesh>;
     if(type==='Balkon')return <group key={id}>{block(id,[x+w/2,base+.08,y+d/2],[w,.16,d],floorColor,id)}{block(id+'-rail',[x+w/2,base+.7,y+d],[w,1.1,.06],'#88d4ee',id,true)}</group>;
     if(type==='Pol'||type==='Shift')return block(id,[x+w/2,base+(type==='Shift'?plan.height:.02),y+d/2],[w,.08,d],floorColor,id);
     return <group key={id}>{block(id,[x+w/2,base+.35,y+d/2],[w,.7,d],element.color??'#7c688e',id)}{block(id+'-back',[x+w/2,base+.65,y+.1],[w,.6,Math.min(.2,d)],element.color??'#7c688e',id)}</group>;
    })}
    {plan.ceiling&&!inside&&block('ceiling',[plan.width/2,floorCount(plan)*plan.height-.08,plan.depth/2],[plan.width,.12,plan.depth],plan.materials?.ceiling??'#e8e8f0')}
    {plan.roof&&!inside&&<mesh geometry={roof} position={[plan.width/2,floorCount(plan)*plan.height,plan.depth/2]} castShadow><meshStandardMaterial color={roofColor} roughness={plan.roofMaterial==='metal'?.3:.75} metalness={plan.roofMaterial==='metal'?.65:0}/></mesh>}
   </group>
  </Canvas><ModelLoading urls={plan.elements.flatMap(e=>e.furniture?[e.furniture.modelUrl]:[])}/>{modelError&&<span className="model-error" role="alert">{modelError}</span>}
 </div>
 {inside&&<div className="toolbar walk-controls">{[['left','← Chap'],['forward','↑ Oldinga'],['back','↓ Orqaga'],['right','O‘ng →']].map(([value,label])=><button key={value} onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);setDirection(value);}} onPointerUp={()=>setDirection('')} onPointerCancel={()=>setDirection('')} onKeyDown={event=>{if(event.key===' '||event.key==='Enter')setDirection(value);}} onKeyUp={()=>setDirection('')} onBlur={()=>setDirection('')}>{label}</button>)}</div>}
 <div className="toolbar"><button disabled={!canvas} onClick={()=>canvas?.toBlob(blob=>{if(blob)download('usta-3d.png',blob);})}>PNG yuklash</button><button disabled={!model.current} onClick={async()=>{if(!model.current)return;try{const result=await new GLTFExporter().parseAsync(model.current,{binary:true});if(result instanceof ArrayBuffer)download('usta-model.glb',new Blob([result],{type:'model/gltf-binary'}));}catch{alert('3D eksport bajarilmadi.');}}}>GLB eksport</button></div>
 </SceneBoundary>;
}
