'use client';
import {useEffect,useMemo,useRef} from 'react';
import {CanvasTexture} from 'three';
import {Canvas,useFrame} from '@react-three/fiber';
import {Float,RoundedBox} from '@react-three/drei';
import type {Group} from 'three';

function ChestLabel(){
  const texture=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
    const context=canvas.getContext('2d')!;
    context.fillStyle='#30245d';context.fillRect(0,0,512,256);
    context.font='bold 64px sans-serif';context.textAlign='center';context.textBaseline='middle';
    context.fillStyle='#ffffff';context.fillText('USTA',194,128);
    context.fillStyle='#ffd16b';context.fillText('PRO',374,128);
    return new CanvasTexture(canvas);
  },[]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh position={[0,.65,.411]}><planeGeometry args={[.7,.35]}/><meshBasicMaterial map={texture}/></mesh>;
}
function RobotModel() {
  const robot=useRef<Group>(null);
  const wave=useRef<Group>(null);
  useFrame(({clock})=>{
    const t=clock.elapsedTime;
    if(robot.current){robot.current.rotation.y=Math.sin(t*.45)*.12;robot.current.position.y=Math.sin(t*1.2)*.035;}
    if(wave.current) wave.current.rotation.z=-.6+Math.sin(t*2.5)*.22;
  });
  return <group ref={robot} position={[0,-.4,0]}>
    <RoundedBox args={[1.2,1.1,.65]} radius={.2} position={[0,.6,0]}><meshStandardMaterial color="#e7eaf6" metalness={.35} roughness={.3}/></RoundedBox>
    <RoundedBox args={[.76,.44,.08]} radius={.08} position={[0,.65,.36]}><meshStandardMaterial color="#30245d"/></RoundedBox>
    <ChestLabel/>
    <RoundedBox args={[.07,.28,.06]} radius={.015} position={[-.4,.07,.4]}><meshStandardMaterial color="#ffce66"/></RoundedBox>
    <RoundedBox args={[.23,.08,.09]} radius={.015} position={[-.4,.19,.4]}><meshStandardMaterial color="#acb6cc"/></RoundedBox>
    <RoundedBox args={[1.27,.85,.78]} radius={.25} position={[0,1.63,0]}><meshStandardMaterial color="#edf0fb" metalness={.4} roughness={.25}/></RoundedBox>
    <RoundedBox args={[.98,.38,.1]} radius={.14} position={[0,1.65,.41]}><meshStandardMaterial color="#132438"/></RoundedBox>
    {[-.24,.24].map(x=><RoundedBox key={x} args={[.19,.065,.035]} radius={.025} position={[x,1.66,.48]}><meshStandardMaterial color="#8cffff" emissive="#37d9ff" emissiveIntensity={3}/></RoundedBox>)}
    <mesh position={[0,2.01,0]}><sphereGeometry args={[.68,24,16,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#ffcd53" metalness={.2} roughness={.35}/></mesh>
    <mesh position={[0,2.02,.07]}><cylinderGeometry args={[.76,.76,.085,32]}/><meshStandardMaterial color="#ffd56b"/></mesh>
    <RoundedBox args={[.11,.42,.88]} radius={.035} position={[0,2.16,0]}><meshStandardMaterial color="#ffe898"/></RoundedBox>
    <group position={[-.67,.94,0]} ref={wave}>
      <RoundedBox args={[.26,.65,.3]} radius={.11} position={[-.18,.23,0]}><meshStandardMaterial color="#b9b0da"/></RoundedBox>
      <RoundedBox args={[.3,.5,.28]} radius={.11} position={[-.27,.73,0]}><meshStandardMaterial color="#eef0fb"/></RoundedBox>
      <mesh position={[-.27,1.02,0]}><sphereGeometry args={[.18,16,16]}/><meshStandardMaterial color="#f4e4b9"/></mesh>
    </group>
    <RoundedBox args={[.28,.8,.28]} radius={.12} position={[.77,.69,.04]} rotation={[0,0,.45]}><meshStandardMaterial color="#d9deef"/></RoundedBox>
    <RoundedBox args={[.58,.25,.3]} radius={.1} position={[1.04,.37,.15]}><meshStandardMaterial color="#e2e9fc"/></RoundedBox>
    <Float speed={2} floatIntensity={.3}><group position={[1.03,.9,.2]}>
      <mesh><boxGeometry args={[.64,.48,.5]}/><meshStandardMaterial color="#5eeaff" wireframe emissive="#36bcea" emissiveIntensity={1}/></mesh>
      <mesh position={[0,.4,0]} rotation={[0,Math.PI/4,0]}><coneGeometry args={[.48,.33,4]}/><meshStandardMaterial color="#92f7ff" wireframe/></mesh>
    </group></Float>
    <RoundedBox args={[1.19,.17,.7]} radius={.04} position={[0,.13,0]}><meshStandardMaterial color="#645186"/></RoundedBox>
    {[-.34,.34].map(x=><group key={x}>
      <RoundedBox args={[.36,.68,.38]} radius={.1} position={[x,-.27,0]}><meshStandardMaterial color="#d5dbea" metalness={.3}/></RoundedBox>
      <RoundedBox args={[.46,.21,.63]} radius={.07} position={[x,-.66,.1]}><meshStandardMaterial color="#8e81ad"/></RoundedBox>
    </group>)}
  </group>;
}
export default function RobotScene(){
  return <Canvas camera={{position:[3,1.6,6.3],fov:37}} dpr={[1,1.5]} gl={{alpha:true,antialias:true}}>
    <ambientLight intensity={1.8}/><directionalLight position={[3,6,5]} intensity={3}/><pointLight position={[-3,1,2]} intensity={15} color="#8c6cff"/>
    <RobotModel/>
  </Canvas>;
}

