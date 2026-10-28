import { useEffect, useMemo, Suspense } from 'react';
import { Canvas, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { PlannerState, PlannerRoom, ExteriorItem } from '@/types';

import grassUrl from '@/assets/photos/grass.jpg';
import brickUrl from '@/assets/photos/brick.jpg';
import concreteUrl from '@/assets/photos/concrete.jpg';
import { YardCar } from '@/components/three/CarScene';
import { PropModel } from '@/components/three/Props';

const WALL_H = 3;
const FLOOR_GAP = 0.25; // qavatlar orasidagi plita qalinligi

/* ---------------- real textures ---------------- */

function useRealTextures() {
  const [grass, brick, concrete] = useLoader(
    THREE.TextureLoader,
    [grassUrl, brickUrl, concreteUrl] as unknown as string[]
  );

  return useMemo(() => {
    const setup = (t: THREE.Texture, rx: number, ry: number) => {
      const c = t.clone();
      c.wrapS = c.wrapT = THREE.RepeatWrapping;
      c.repeat.set(rx, ry);
      c.colorSpace = THREE.SRGBColorSpace;
      c.anisotropy = 4;
      c.needsUpdate = true;
      return c;
    };
    return {
      grass: setup(grass, 9, 9),
      brick: setup(brick, 2, 1),
      concrete: setup(concrete, 2, 2),
    };
  }, [grass, brick, concrete]);
}

function Ground({ tex, night }: { tex: THREE.Texture; night: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[70, 70]} />
      <meshStandardMaterial
        map={tex}
        color={night ? '#3E5F43' : '#FFFFFF'}
        roughness={1}
      />
    </mesh>
  );
}

/* ---------------- camera rig ---------------- */

const VIEWS: Record<string, [number, number, number]> = {
  iso: [16, 12, 16],
  top: [0.01, 26, 0.01],
  side: [24, 7, 0.01],
  front: [0.01, 7, 24],
};

function Rig({ view, zoomTick, levels = 1 }: { view: string; zoomTick: number; levels?: number }) {
  const { camera, controls } = useThree() as any;

  useEffect(() => {
    if (!controls) return;
    const base = VIEWS[view] || VIEWS.iso;
    // qavatlar soniga qarab kamerani uzoqlashtirish — uy ekrandan chiqmasin
    const k = 1 + (levels - 1) * 0.35;
    camera.position.set(base[0] * k, base[1] * (1 + (levels - 1) * 0.5), base[2] * k);
    controls.target.set(0, Math.max(1, (levels * WALL_H) / 2), 0);
    controls.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, levels]);

  useEffect(() => {
    if (!controls || zoomTick === 0) return;
    const dir = camera.position.clone().sub(controls.target);
    const len = dir.length();
    const next = zoomTick > 0 ? len * 0.78 : len * 1.28;
    if (next < 6 || next > 80) return;
    dir.setLength(next);
    camera.position.copy(controls.target).add(dir);
    controls.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomTick]);

  return null;
}

/* ---------------- rooms ---------------- */

function Room({
  room,
  state,
  tex,
  offset = 0,
}: {
  room: PlannerRoom;
  state: PlannerState;
  tex: { brick: THREE.Texture; concrete: THREE.Texture };
  offset?: number;
}) {
  const { w, d, x, z } = room;
  const t = 0.22;
  const walls: JSX.Element[] = [];

  const wallMat = (
    <meshStandardMaterial map={tex.brick} color={state.wallColor} roughness={0.85} />
  );

  walls.push(
    <mesh key="f" position={[x, WALL_H / 2 + offset, z + d / 2]}>
      <boxGeometry args={[w, WALL_H, t]} />
      {wallMat}
    </mesh>
  );
  walls.push(
    <mesh key="b" position={[x, WALL_H / 2 + offset, z - d / 2]}>
      <boxGeometry args={[w, WALL_H, t]} />
      {wallMat}
    </mesh>
  );
  walls.push(
    <mesh key="l" position={[x - w / 2, WALL_H / 2 + offset, z]}>
      <boxGeometry args={[t, WALL_H, d]} />
      {wallMat}
    </mesh>
  );
  walls.push(
    <mesh key="r" position={[x + w / 2, WALL_H / 2 + offset, z]}>
      <boxGeometry args={[t, WALL_H, d]} />
      {wallMat}
    </mesh>
  );

  if (room.door) {
    walls.push(
      <mesh key="d" position={[x - w / 4, 1.05 + offset, z + d / 2 + 0.02]}>
        <boxGeometry args={[1, 2.1, t + 0.06]} />
        <meshStandardMaterial color="#6B4A2B" roughness={0.7} />
      </mesh>
    );
  }

  for (let i = 0; i < room.windows; i++) {
    const wx = x + w / 4 - i * (w / 2);
    walls.push(
      <mesh key={`w${i}`} position={[wx, 1.7 + offset, z - d / 2 - 0.02]}>
        <boxGeometry args={[1.2, 1.2, t + 0.06]} />
        <meshStandardMaterial
          color={state.night ? '#FFD98A' : '#8FD8FF'}
          emissive={state.night ? '#FFB74D' : '#000000'}
          emissiveIntensity={state.night ? 0.9 : 0}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>
    );
  }

  return (
    <group>
      <mesh position={[x, 0.05 + offset, z]} receiveShadow>
        <boxGeometry args={[w, 0.1, d]} />
        <meshStandardMaterial
          map={tex.concrete}
          color={state.floorColor}
          roughness={0.95}
        />
      </mesh>
      {offset > 0 && (
        <mesh position={[x, offset - FLOOR_GAP / 2, z]}>
          <boxGeometry args={[w + 0.2, FLOOR_GAP, d + 0.2]} />
          <meshStandardMaterial map={tex.concrete} color="#B9C2CE" roughness={0.95} />
        </mesh>
      )}
      {walls}
    </group>
  );
}

function Roof({ rooms, color, baseY = 0 }: { rooms: PlannerRoom[]; color: string; baseY?: number }) {
  if (rooms.length === 0) return null;
  const minX = Math.min(...rooms.map((r) => r.x - r.w / 2));
  const maxX = Math.max(...rooms.map((r) => r.x + r.w / 2));
  const minZ = Math.min(...rooms.map((r) => r.z - r.d / 2));
  const maxZ = Math.max(...rooms.map((r) => r.z + r.d / 2));
  const W = maxX - minX + 0.8;
  const D = maxZ - minZ + 0.8;
  const H = Math.max(1.4, Math.min(W, D) * 0.38);
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;

  return (
    <mesh position={[cx, baseY + WALL_H + H / 2 + 0.05, cz]} scale={[W / 2 + 0.1, H, D / 2 + 0.1]}>
      <coneGeometry args={[1, 1, 4, 1]} />
      <meshStandardMaterial color={color} roughness={0.6} metalness={0.15} />
    </mesh>
  );
}

/* ---------------- exterior elements ---------------- */

function Tree({ kind, night }: { kind: ExteriorItem['kind']; night: boolean }) {
  const leaf = night ? '#1E5B3C' : '#2E8B57';
  const trunk = <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.13, 0.18, 1, 8]} /><meshStandardMaterial color="#6B4A2B" /></mesh>;

  if (kind === 'archa') {
    return (
      <group>
        {trunk}
        <mesh position={[0, 1.6, 0]}><coneGeometry args={[1.1, 1.9, 10]} /><meshStandardMaterial color={leaf} /></mesh>
        <mesh position={[0, 2.8, 0]}><coneGeometry args={[0.8, 1.6, 10]} /><meshStandardMaterial color={leaf} /></mesh>
        <mesh position={[0, 3.9, 0]}><coneGeometry args={[0.5, 1.3, 10]} /><meshStandardMaterial color={leaf} /></mesh>
      </group>
    );
  }
  if (kind === 'terak') {
    return (
      <group>
        <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.12, 0.16, 2.8, 8]} /><meshStandardMaterial color="#6B4A2B" /></mesh>
        <mesh position={[0, 4.2, 0]} scale={[0.8, 2.2, 0.8]}><sphereGeometry args={[1, 14, 14]} /><meshStandardMaterial color={leaf} /></mesh>
      </group>
    );
  }
  if (kind === 'olma') {
    return (
      <group>
        {trunk}
        <mesh position={[0, 2.1, 0]}><sphereGeometry args={[1.35, 16, 16]} /><meshStandardMaterial color={leaf} /></mesh>
        <mesh position={[0.9, 2.6, 0.4]}><sphereGeometry args={[0.8, 12, 12]} /><meshStandardMaterial color="#37A068" /></mesh>
        {!night && <mesh position={[-0.7, 2.3, 0.7]}><sphereGeometry args={[0.7, 12, 12]} /><meshStandardMaterial color="#37A068" /></mesh>}
      </group>
    );
  }
  if (kind === 'qayragoch') {
    return (
      <group>
        <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.22, 0.3, 1.4, 8]} /><meshStandardMaterial color="#5C4023" /></mesh>
        <mesh position={[0, 2.6, 0]} scale={[1.6, 1.2, 1.6]}><sphereGeometry args={[1.3, 16, 16]} /><meshStandardMaterial color="#35704B" /></mesh>
      </group>
    );
  }
  if (kind === 'bush') {
    return (
      <group>
        <mesh position={[0, 0.45, 0]}><sphereGeometry args={[0.6, 12, 12]} /><meshStandardMaterial color={leaf} /></mesh>
        <mesh position={[0.7, 0.35, 0.2]}><sphereGeometry args={[0.45, 12, 12]} /><meshStandardMaterial color="#249160" /></mesh>
      </group>
    );
  }
  return null;
}

function Exterior({
  item,
  night,
  tex,
}: {
  item: ExteriorItem;
  night: boolean;
  tex?: { brick?: THREE.Texture; concrete?: THREE.Texture; grass?: THREE.Texture };
}) {
  if (item.kind === 'prop') {
    return (
      <group position={[item.x, 0, item.z]}>
        <PropModel kind={item.propKind || 'crate'} color={item.propColor} night={night} tex={tex} />
      </group>
    );
  }
  if (item.kind === 'car') {
    return (
      <group position={[item.x, 0, item.z]} rotation={[0, Math.PI / 6, 0]}>
        <YardCar body={item.carBody || 'sedan'} color={item.carColor || '#C9CFD8'} />
        {night && <pointLight position={[0, 1.2, 2.4]} intensity={5} distance={6} color="#FFE9A0" />}
      </group>
    );
  }
  if (item.kind === 'path') {
    return (
      <mesh position={[item.x, 0.04, item.z]}>
        <boxGeometry args={[1.6, 0.08, 5]} />
        <meshStandardMaterial color={night ? '#3A4453' : '#9AA9BC'} />
      </mesh>
    );
  }
  if (item.kind === 'fence') {
    const posts = [];
    for (let i = -4; i <= 4; i++) {
      posts.push(
        <mesh key={i} position={[i * 0.9, 0.5, 0]}>
          <boxGeometry args={[0.14, 1, 0.14]} />
          <meshStandardMaterial color="#8E5F2E" />
        </mesh>
      );
    }
    return (
      <group position={[item.x, 0, item.z]}>
        {posts}
        <mesh position={[0, 0.8, 0]}><boxGeometry args={[7.4, 0.12, 0.1]} /><meshStandardMaterial color="#A9743F" /></mesh>
        <mesh position={[0, 0.4, 0]}><boxGeometry args={[7.4, 0.12, 0.1]} /><meshStandardMaterial color="#A9743F" /></mesh>
      </group>
    );
  }
  if (item.kind === 'light') {
    return (
      <group position={[item.x, 0, item.z]}>
        <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.07, 0.1, 2.8, 8]} /><meshStandardMaterial color="#3F4A5A" /></mesh>
        <mesh position={[0, 2.95, 0]}>
          <sphereGeometry args={[0.28, 12, 12]} />
          <meshStandardMaterial color={night ? '#FFE9A8' : '#CFE6FF'} emissive={night ? '#FFD54F' : '#000000'} emissiveIntensity={night ? 1.4 : 0} />
        </mesh>
        {night && <pointLight position={[0, 2.8, 0]} intensity={14} distance={12} color="#FFD54F" />}
      </group>
    );
  }
  return (
    <group position={[item.x, 0, item.z]}>
      <Tree kind={item.kind} night={night} />
    </group>
  );
}

/* ---------------- scene ---------------- */

export interface HouseSceneProps {
  state: PlannerState;
  view: string;
  zoomTick: number;
}

export function HouseScene({ state, view, zoomTick }: HouseSceneProps) {
  const night = state.night;
  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [16, 12, 16], fov: 50, near: 0.1, far: 400 }}
      gl={{ antialias: true }}
    >
      <Suspense fallback={null}>
        <SceneContent state={state} view={view} zoomTick={zoomTick} night={night} />
      </Suspense>
    </Canvas>
  );
}

function SceneContent({
  state,
  view,
  zoomTick,
  night,
}: HouseSceneProps & { night: boolean }) {
  const tex = useRealTextures();

  return (
    <>
      <color attach="background" args={[night ? '#050D18' : '#0B2545']} />
      <fog attach="fog" args={[night ? '#050D18' : '#0B2545', 48, 95]} />

      <ambientLight intensity={night ? 0.28 : 0.65} color={night ? '#7C9CFF' : '#FFFFFF'} />
      <hemisphereLight args={[night ? '#10254A' : '#BFD9FF', night ? '#0A1526' : '#2E7D52', night ? 0.3 : 0.55]} />
      <directionalLight
        position={[14, 20, 10]}
        intensity={night ? 0.18 : 1.05}
        color={night ? '#9FB6FF' : '#FFF6E5'}
      />

      {/* haqiqiy maysazor */}
      <Ground tex={tex.grass} night={night} />

      {Array.from({ length: state.floors || 1 }).map((_, f) =>
        state.rooms
          .filter((room) => (room.floor ?? 1) === f + 1)
          .map((room) => (
            <Room
              key={`${f}-${room.id}`}
              room={room}
              state={state}
              tex={tex}
              offset={f * (WALL_H + FLOOR_GAP)}
            />
          ))
      )}
      {state.roofOn && state.rooms.length > 0 && (
        <Roof
          rooms={state.rooms}
          color={state.roofColor}
          baseY={
            (state.rooms.reduce((m, r) => Math.max(m, r.floor ?? 1), 1) - 1) *
            (WALL_H + FLOOR_GAP)
          }
        />
      )}
      {state.items.map((item) => (
        <Exterior key={item.id} item={item} night={night} tex={tex} />
      ))}

      <Rig view={view} zoomTick={zoomTick} levels={state.floors || 1} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={6}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2 - 0.05}
        target={[0, 1, 0]}
      />
    </>
  );
}
