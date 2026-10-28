import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { CarBody } from '@/types';

/**
 * O'zbek mashinasi 3D modeli — sedan / suv / van.
 * Protsedural korpus, salon, oynalar, faralar va g'ildiraklar.
 * `spin` true bo'lsa sekin aylanadi (kartochka ko'rinishi uchun).
 */
function CarModel({
  body,
  color,
  spin = false,
}: {
  body: CarBody;
  color: string;
  spin?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (group.current && spin) group.current.rotation.y += 0.004;
  });

  const isVan = body === 'van';
  const isSuv = body === 'suv';

  const L = isVan ? 4.6 : isSuv ? 4.5 : 4.4;        // uzunlik
  const W = 1.85;                                     // kenglik
  const bodyH = isVan ? 1.0 : isSuv ? 0.85 : 0.7;     // korpus balandligi
  const cabinH = isVan ? 1.35 : isSuv ? 0.85 : 0.68;  // salon balandligi
  const cabinL = isVan ? 3.6 : isSuv ? 2.6 : 2.3;
  const wheelR = isSuv ? 0.4 : isVan ? 0.36 : 0.34;
  const bodyY = wheelR + bodyH / 2 - 0.06;
  const cabinZ = isVan ? 0.1 : -0.15;

  const paint = <meshStandardMaterial color={color} roughness={0.28} metalness={0.65} />;

  const wheels: JSX.Element[] = [];
  const wheelZ = L / 2 - 0.85;
  const wheelX = W / 2 - 0.12;
  for (const [wx, wz] of [
    [wheelX, wheelZ],
    [-wheelX, wheelZ],
    [wheelX, -wheelZ],
    [-wheelX, -wheelZ],
  ] as const) {
    wheels.push(
      <group key={`${wx}:${wz}`} position={[wx, wheelR, wz]} rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={[wheelR, wheelR, 0.24, 22]} />
          <meshStandardMaterial color="#14161A" roughness={0.9} />
        </mesh>
        <mesh position={[0, wx > 0 ? 0.02 : -0.02, 0]}>
          <cylinderGeometry args={[wheelR * 0.55, wheelR * 0.55, 0.26, 16]} />
          <meshStandardMaterial color="#B9C2CE" roughness={0.35} metalness={0.8} />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={group}>
      {/* korpus */}
      <mesh position={[0, bodyY, 0]}>
        <boxGeometry args={[W, bodyH, L]} />
        {paint}
      </mesh>

      {/* salon */}
      <mesh position={[0, bodyY + bodyH / 2 + cabinH / 2 - 0.02, cabinZ]}>
        <boxGeometry args={[W - 0.12, cabinH, cabinL]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} />
      </mesh>

      {/* old va orqa oynalar (furgonda old oyna qisman boshqacha) */}
      <mesh
        position={[0, bodyY + bodyH / 2 + cabinH / 2, cabinZ + cabinL / 2 + 0.01]}
        rotation={[isVan ? 0.12 : 0.32, 0, 0]}
      >
        <boxGeometry args={[W - 0.2, cabinH * (isVan ? 0.8 : 0.9), 0.06]} />
        <meshStandardMaterial color="#0E1620" roughness={0.08} metalness={0.2} />
      </mesh>
      <mesh
        position={[0, bodyY + bodyH / 2 + cabinH / 2, cabinZ - cabinL / 2 - 0.01]}
        rotation={[-(isVan ? 0.05 : 0.28), 0, 0]}
      >
        <boxGeometry args={[W - 0.2, cabinH * (isVan ? 0.7 : 0.85), 0.06]} />
        <meshStandardMaterial color="#0E1620" roughness={0.08} metalness={0.2} />
      </mesh>

      {/* yon oynalar */}
      <mesh position={[W / 2 - 0.04, bodyY + bodyH / 2 + cabinH / 2 - 0.02, cabinZ + (isVan ? 0.6 : 0)]}>
        <boxGeometry args={[0.05, cabinH * 0.6, cabinL * 0.5]} />
        <meshStandardMaterial color="#121B26" roughness={0.1} metalness={0.2} />
      </mesh>
      <mesh position={[-W / 2 + 0.04, bodyY + bodyH / 2 + cabinH / 2 - 0.02, cabinZ + (isVan ? 0.6 : 0)]}>
        <boxGeometry args={[0.05, cabinH * 0.6, cabinL * 0.5]} />
        <meshStandardMaterial color="#121B26" roughness={0.1} metalness={0.2} />
      </mesh>

      {/* old faralar */}
      <mesh position={[W / 2 - 0.4, bodyY + 0.06, L / 2 + 0.02]}>
        <boxGeometry args={[0.42, 0.18, 0.06]} />
        <meshStandardMaterial color="#FFF6D8" emissive="#FFE9A0" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[-W / 2 + 0.4, bodyY + 0.06, L / 2 + 0.02]}>
        <boxGeometry args={[0.42, 0.18, 0.06]} />
        <meshStandardMaterial color="#FFF6D8" emissive="#FFE9A0" emissiveIntensity={0.9} />
      </mesh>

      {/* orqa chiroqlar */}
      <mesh position={[W / 2 - 0.35, bodyY + 0.1, -L / 2 - 0.02]}>
        <boxGeometry args={[0.38, 0.16, 0.05]} />
        <meshStandardMaterial color="#E0353C" emissive="#FF2A33" emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[-W / 2 + 0.35, bodyY + 0.1, -L / 2 - 0.02]}>
        <boxGeometry args={[0.38, 0.16, 0.05]} />
        <meshStandardMaterial color="#E0353C" emissive="#FF2A33" emissiveIntensity={0.7} />
      </mesh>

      {/* bamperlar */}
      <mesh position={[0, bodyY - bodyH / 2 + 0.14, L / 2 - 0.03]}>
        <boxGeometry args={[W + 0.02, 0.26, 0.1]} />
        <meshStandardMaterial color="#1B1F26" roughness={0.7} />
      </mesh>
      <mesh position={[0, bodyY - bodyH / 2 + 0.14, -L / 2 + 0.03]}>
        <boxGeometry args={[W + 0.02, 0.26, 0.1]} />
        <meshStandardMaterial color="#1B1F26" roughness={0.7} />
      </mesh>

      {wheels}
    </group>
  );
}

export interface CarSceneProps {
  body: CarBody;
  color: string;
}

/** Do'kon kartochkasidagi kichik 3D ko'rinish — sichqoncha bilan aylantirsa bo'ladi */
export function CarScene({ body, color }: CarSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ position: [4.6, 2.4, 5.4], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.75} color="#DCE9FF" />
      <directionalLight position={[6, 9, 5]} intensity={1.15} color="#FFF6E5" />
      <directionalLight position={[-6, 4, -6]} intensity={0.4} color="#7FB2FF" />
      {/* yo'l halqasi */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[4.4, 40]} />
        <meshStandardMaterial color="#0C1B2E" roughness={1} />
      </mesh>
      <Suspense fallback={null}>
        <CarModel body={body} color={color} spin />
      </Suspense>
      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={14}
        minPolarAngle={0.4}
        maxPolarAngle={Math.PI / 2 - 0.08}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}

/** Uy loyihasi sahnasiga hovliga qo'yiladigan statik 3D mashina */
export function YardCar({ body, color }: CarSceneProps) {
  return <CarModel body={body} color={color} />;
}
