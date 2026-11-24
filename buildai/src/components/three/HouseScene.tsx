import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
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

type Textures = { grass?: THREE.Texture; brick?: THREE.Texture; concrete?: THREE.Texture };

function useRealTextures() {
  const [textures, setTextures] = useState<Textures>({});
  useEffect(() => {
    let mounted = true;
    const loader = new THREE.TextureLoader();
    const sources = [
      ['grass', grassUrl, 9, 9], ['brick', brickUrl, 2, 1], ['concrete', concreteUrl, 2, 2],
    ] as const;
    const loaded = sources.map(([key, url, x, y]) => loader.load(url, (texture) => {
      if (!mounted) return;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(x, y);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 2;
      setTextures((previous) => ({ ...previous, [key]: texture }));
    }, undefined, () => {
      // The solid-color model remains usable if a texture cannot load.
    }));
    return () => {
      mounted = false;
      loaded.forEach((texture) => texture.dispose());
    };
  }, []);
  return textures;
}

function Ground({ tex, night }: { tex?: THREE.Texture; night: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[70, 70]} />
      <meshStandardMaterial
        key={tex?.uuid ?? 'grass-color'}
        map={tex ?? null}
        color={night ? '#3E5F43' : tex ? '#D1E5C9' : '#54844E'}
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

function Rig({ view, zoomTick, levels, rooms, fitTick }: { view: string; zoomTick: number; levels: number; rooms: PlannerRoom[]; fitTick: number }) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as import('three-stdlib').OrbitControls | null;
  const previousZoom = useRef(zoomTick);
  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;

  useEffect(() => {
    if (!controls) return;
    const base = VIEWS[view] || VIEWS.iso;
    const bounds = new THREE.Box3();
    for (const room of roomsRef.current) {
      bounds.expandByPoint(new THREE.Vector3(room.x - room.w / 2, 0, room.z - room.d / 2));
      bounds.expandByPoint(new THREE.Vector3(room.x + room.w / 2, (room.floor ?? 1) * (WALL_H + FLOOR_GAP), room.z + room.d / 2));
    }
    const center = bounds.isEmpty() ? new THREE.Vector3(0, 1, 0) : bounds.getCenter(new THREE.Vector3());
    const radius = bounds.getSize(new THREE.Vector3()).length() / 2;
    const aspect = camera instanceof THREE.PerspectiveCamera ? Math.min(1, camera.aspect) : 1;
    const distance = THREE.MathUtils.clamp(radius * 2.6 / Math.max(0.5, aspect), 14, 180);
    camera.position.copy(center).add(new THREE.Vector3(...base).setLength(distance));
    controls.target.copy(center);
    controls.update();
  }, [camera, controls, view, levels, fitTick]);

  useEffect(() => {
    if (!controls || zoomTick === previousZoom.current) return;
    const delta = zoomTick - previousZoom.current;
    previousZoom.current = zoomTick;
    const dir = camera.position.clone().sub(controls.target);
    const len = dir.length();
    const next = len * 0.8 ** delta;
    dir.setLength(THREE.MathUtils.clamp(next, 6, 180));
    camera.position.copy(controls.target).add(dir);
    controls.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, controls, zoomTick]);

  return null;
}

/* ---------------- rooms ---------------- */

function Room({
  room,
  state,
  tex,
  offset = 0,
  selected,
  onSelect,
}: {
  room: PlannerRoom;
  state: PlannerState;
  tex: Textures;
  offset?: number;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const { w, d, x, z } = room;
  const t = 0.22;
  const walls: JSX.Element[] = [];

  const wallMat = (
    <meshStandardMaterial map={tex.brick ?? null} color={state.wallColor} roughness={0.85} />
  );

  const addWall = (key: string, width: number, height: number, depth: number, px: number, py: number, pz: number) => {
    if (width <= 0 || height <= 0) return;
    walls.push(
      <mesh key={key} position={[px, py + offset, pz]}>
        <boxGeometry args={[width, height, depth]} />
        {wallMat}
      </mesh>
    );
  };

  const front = z + d / 2;
  const back = z - d / 2;
  if (room.door) {
    const doorWidth = Math.min(0.9, w * 0.5);
    const side = (w - doorWidth) / 2;
    addWall('front-left', side, WALL_H, t, x - (w + doorWidth) / 4, WALL_H / 2, front);
    addWall('front-right', side, WALL_H, t, x + (w + doorWidth) / 4, WALL_H / 2, front);
    addWall('door-header', doorWidth, WALL_H - 2.1, t, x, (WALL_H + 2.1) / 2, front);
    walls.push(
      <group key="door" position={[x - doorWidth / 2, 1.05 + offset, front]} rotation={[0, -Math.PI / 3, 0]}>
        <mesh position={[doorWidth / 2, 0, 0]}>
          <boxGeometry args={[doorWidth, 2.1, 0.07]} />
          <meshStandardMaterial color="#6B4A2B" roughness={0.7} />
        </mesh>
      </group>
    );
  } else {
    addWall('front', w, WALL_H, t, x, WALL_H / 2, front);
  }

  const windows = Math.max(0, Math.min(4, Math.floor(room.windows ?? 0)));
  if (windows) {
    const bay = w / windows;
    const span = Math.min(1.2, bay * 0.68);
    const sill = 1.05;
    const head = 2.25;
    addWall('back-base', w, sill, t, x, sill / 2, back);
    addWall('back-top', w, WALL_H - head, t, x, (WALL_H + head) / 2, back);
    for (let i = 0; i < windows; i++) {
      const center = x - w / 2 + (i + 0.5) * bay;
      const edge = (bay - span) / 2;
      addWall(`window-left-${i}`, edge, head - sill, t, center - (bay + span) / 4, (head + sill) / 2, back);
      addWall(`window-right-${i}`, edge, head - sill, t, center + (bay + span) / 4, (head + sill) / 2, back);
      walls.push(
        <mesh key={`window-${i}`} position={[center, (head + sill) / 2 + offset, back]}>
          <boxGeometry args={[span, head - sill, 0.045]} />
          <meshStandardMaterial color={state.night ? '#FFD98A' : '#8FD8FF'} transparent opacity={0.58}
            emissive={state.night ? '#FFB74D' : '#000000'} emissiveIntensity={0.7} roughness={0.18} />
        </mesh>
      );
    }
  } else {
    addWall('back', w, WALL_H, t, x, WALL_H / 2, back);
  }
  addWall('left', t, WALL_H, d, x - w / 2, WALL_H / 2, z);
  addWall('right', t, WALL_H, d, x + w / 2, WALL_H / 2, z);

  return (
    <group onClick={(event) => { event.stopPropagation(); if (event.delta < 5) onSelect(room.id); }}>
      <mesh position={[x, 0.05 + offset, z]} receiveShadow>
        <boxGeometry args={[w, 0.1, d]} />
        <meshStandardMaterial
          map={tex.concrete ?? null}
          color={selected ? '#29B6FF' : state.floorColor}
          roughness={0.95}
        />
      </mesh>
      {offset > 0 && (
        <mesh position={[x, offset - FLOOR_GAP / 2, z]}>
          <boxGeometry args={[w + 0.2, FLOOR_GAP, d + 0.2]} />
          <meshStandardMaterial map={tex.concrete ?? null} color="#B9C2CE" roughness={0.95} />
        </mesh>
      )}
      {walls}
    </group>
  );
}

function Roof({ room, color }: { room: PlannerRoom; color: string }) {
  const width = room.w + 0.65;
  const depth = room.d + 0.65;
  const height = Math.min(3, width * 0.3);
  const shape = useMemo(() => {
    const profile = new THREE.Shape();
    profile.moveTo(-width / 2, 0);
    profile.lineTo(width / 2, 0);
    profile.lineTo(0, height);
    profile.closePath();
    return profile;
  }, [width, height]);
  const offset = ((room.floor ?? 1) - 1) * (WALL_H + FLOOR_GAP);
  return (
    <mesh position={[room.x, offset + WALL_H, room.z - depth / 2]}>
      <extrudeGeometry args={[shape, { depth, bevelEnabled: false }]} />
      <meshStandardMaterial color={color} roughness={0.72} />
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
  onFailure: () => void;
  onSelect: (id: string) => void;
  selected: string | null;
  cutawayFloor: number | null;
  fitTick: number;
}

export function HouseScene(props: HouseSceneProps) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.35]}
      camera={{ position: [16, 12, 16], fov: 50, near: 0.1, far: 400 }}
      gl={{ antialias: false }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}

function SceneContent({
  state,
  view,
  zoomTick,
  onFailure, onSelect, selected, cutawayFloor, fitTick,
}: HouseSceneProps) {
  const { night } = state;
  const tex = useRealTextures();
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(() => {
    const handleContextLoss = () => onFailure();
    canvas.addEventListener('webglcontextlost', handleContextLoss);
    return () => canvas.removeEventListener('webglcontextlost', handleContextLoss);
  }, [canvas, onFailure]);

  const visibleRooms = cutawayFloor === null ? state.rooms : state.rooms.filter((room) => (room.floor ?? 1) <= cutawayFloor);
  const roofs = cutawayFloor === null && state.roofOn ? visibleRooms.filter((room) => !visibleRooms.some((above) =>
    (above.floor ?? 1) > (room.floor ?? 1) && Math.abs(room.x - above.x) < (room.w + above.w) / 2
    && Math.abs(room.z - above.z) < (room.d + above.d) / 2
  )) : [];

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

      {visibleRooms.map((room) => (
        <Room key={room.id} room={room} state={state} tex={tex} selected={selected === room.id} onSelect={onSelect}
          offset={((room.floor ?? 1) - 1) * (WALL_H + FLOOR_GAP)} />
      ))}
      {roofs.map((room) => <Roof key={room.id} room={room} color={state.roofColor} />)}
      {state.items.map((item) => (
        <Exterior key={item.id} item={item} night={night} tex={tex} />
      ))}

      <Rig view={view} zoomTick={zoomTick} levels={cutawayFloor ?? state.floors ?? 1} rooms={visibleRooms} fitTick={fitTick} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={6}
        maxDistance={180}
        maxPolarAngle={Math.PI / 2 - 0.05}
        target={[0, 1, 0]}
      />
    </>
  );
}
