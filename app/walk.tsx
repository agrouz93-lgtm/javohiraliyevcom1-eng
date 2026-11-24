'use client';
import {useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import {Vector3} from 'three';
export function Walk({inside,direction}:{inside:boolean;direction:string}){
 const forward=useMemo(()=>new Vector3(),[]),side=useMemo(()=>new Vector3(),[]);
 useFrame(({camera,controls},delta)=>{
  if(!inside||!direction||!controls)return;
  camera.getWorldDirection(forward);forward.y=0;forward.normalize();side.crossVectors(forward,camera.up).normalize();
  const movement=direction==='left'?side.multiplyScalar(-1):direction==='right'?side:direction==='back'?forward.multiplyScalar(-1):forward;
  movement.multiplyScalar(Math.min(delta,.05)*2);camera.position.add(movement);
  const orbit=controls as unknown as {target:Vector3;update:()=>void};orbit.target.add(movement);orbit.update();
 });return null;
}
