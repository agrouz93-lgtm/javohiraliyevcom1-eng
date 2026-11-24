'use client';
import {Component,useEffect,useRef,useState} from 'react';
import {Canvas} from '@react-three/fiber';
import {RoundedBox} from '@react-three/drei';

function Block({at,size,color,rotation=[0,0,0]}:{at:[number,number,number];size:[number,number,number];color:string;rotation?:[number,number,number]}){
 return <RoundedBox position={at} args={size} rotation={rotation} radius={.055} smoothness={2}><meshStandardMaterial color={color} roughness={.4} metalness={.12}/></RoundedBox>;
}
function Coin({at}:{at:[number,number,number]}){
 return <mesh position={at}><cylinderGeometry args={[.34,.34,.09,32]}/><meshStandardMaterial color="#ffd045" metalness={.6} roughness={.25}/></mesh>;
}
function Model({index}:{index:number}){
 if(index===0)return <group rotation={[0,-.25,0]}>
  <Block at={[0,-.12,0]} size={[2.8,.12,1.8]} color="#33215d"/>
  {[-1,-.5,0,.5,1].map(x=><Block key={x} at={[x,-.047,0]} size={[.012,.01,1.7]} color="#766398"/>)}
  {[-.6,0,.6].map(z=><Block key={z} at={[0,-.047,z]} size={[2.7,.01,.012]} color="#766398"/>)}
  <Block at={[0,.02,0]} size={[1.6,.055,1.05]} color="#9f54db"/>
  {[[-.8,-.53],[-.8,.53],[.8,-.53],[.8,.53]].map(([x,z])=><mesh key={x+':'+z} position={[x,.12,z]}><sphereGeometry args={[.075,12,12]}/><meshStandardMaterial color="#ffd838" emissive="#bf8b13" emissiveIntensity={.4}/></mesh>)}
  <Block at={[.75,.28,-.4]} size={[.85,.5,.42]} color="#ffc634"/>
  <Block at={[-.35,.11,.72]} size={[2,.08,.3]} color="#ffc634"/>
  {Array.from({length:11},(_,i)=><Block key={i} at={[-1.2+i*.17,.158,.73]} size={[.025,.015,i%2?.12:.23]} color="#5a4014"/>)}
 </group>;
 if(index===1)return <group rotation={[0,-.25,0]}>
  {[0,1].flatMap(y=>[0,1,2].map(x=><Block key={y+':'+x} at={[-.85+x*.5,y*.22-.15,.45]} size={[.46,.2,.55]} color={y?'#e7a365':'#c97a45'}/>))}
  <Block at={[.48,.35,-.35]} size={[.7,1.15,.48]} color="#d4c9af" rotation={[0,0,-.08]}/>
  <Block at={[.48,.38,-.09]} size={[.46,.18,.025]} color="#827259"/>
  {[0,1,2].map(x=><Block key={x} at={[.9+x*.15,.6,-.65]} size={[.065,1.65,.07]} color="#9eabba" rotation={[0,0,-.12]}/>)}
  <Block at={[-.7,.05,-.5]} size={[1.4,.13,.5]} color="#797a8b"/>
 </group>;
 if(index===2)return <group rotation={[0,-.35,0]}>
  <Block at={[0,-.25,0]} size={[3,.12,2.05]} color="#293f3d"/>
  <Block at={[0,.22,0]} size={[2.2,.85,1.4]} color="#dde2ed"/>
  <Block at={[0,.68,0]} size={[2.5,.1,1.65]} color="#3d3859"/>
  <Block at={[-.25,1.02,-.12]} size={[1.3,.6,1.05]} color="#e3dcd8"/>
  <Block at={[-.25,1.36,-.12]} size={[1.55,.09,1.25]} color="#53516c"/>
  {[-.7,0,.7].map(x=><Block key={x} at={[x,.25,.72]} size={[.55,.58,.025]} color="#68bedc"/>)}
  <Block at={[-.25,1.03,.42]} size={[.95,.36,.025]} color="#ffcf76"/>
 </group>;
 return <group rotation={[-.12,0,0]}>
  <group rotation={[-.3,0,-.12]}>
   <Block at={[-.38,.25,0]} size={[1.15,.2,1.55]} color="#7653aa"/>
   <Block at={[-.38,.37,-.42]} size={[.9,.05,.35]} color="#add6ce"/>
   {Array.from({length:4},(_,row)=>[0,1,2].map(col=><Block key={row+':'+col} at={[-.72+col*.34,.37,-.04+row*.27]} size={[.23,.07,.16]} color={col===2?'#ffc943':'#c09ee3'}/>))}
  </group>
  <Block at={[.6,.12,-.5]} size={[1.2,.055,1.6]} color="#d9d2e7" rotation={[0,-.2,0]}/>
  {[-.85,-.52,-.19].map(z=><Block key={z} at={[.72,.16,z]} size={[.65,.014,.025]} color="#76628d"/>)}
  {[0,1,2,3].map(i=><Coin key={i} at={[.92,.1+i*.1,.62]}/>)}
 </group>;
}
class Boundary extends Component<{children:React.ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<span className="feature-3d-fallback" aria-label="3D tasvir">◇</span>:this.props.children;}
}
export default function FeatureArt3D({index}:{index:number}){
 const element=useRef<HTMLDivElement>(null);
 const [visible,setVisible]=useState(false);
 useEffect(()=>{
  const observer=new IntersectionObserver(entries=>setVisible(entries[0].isIntersecting),{rootMargin:'150px'});
  if(element.current)observer.observe(element.current);
  return ()=>observer.disconnect();
 },[]);
 return <div ref={element} className="home-feature-art home-feature-3d" aria-hidden><Boundary>{visible&&<Canvas frameloop="demand" dpr={1} camera={{position:[3.3,3.1,4.6],fov:35}} gl={{alpha:true,antialias:true,powerPreference:'low-power'}}>
  <ambientLight intensity={1.8}/><directionalLight position={[3,5,4]} intensity={3}/><pointLight position={[-3,2,-2]} color="#bc77ff" intensity={12}/><Model index={index}/>
 </Canvas>}</Boundary></div>;
}
