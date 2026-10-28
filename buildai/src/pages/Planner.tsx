import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import { t } from '@/translations';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { HouseScene } from '@/components/three/HouseScene';
import {
  Save, Plus, Trash2, RotateCcw, Maximize2, Moon, Sun,
  Minus, House, Grid2x2, Box, Package,
} from 'lucide-react';
import type { PlannerState, PlannerRoom, ExteriorItem, ExteriorKind, Project } from '@/types';
import { SHOP_ITEMS } from '@/data/products';
import { Car as CarIcon } from 'lucide-react';

const ROOM_TYPES: { label: string; w: number; d: number }[] = [
  { label: 'Mehmonxona', w: 5, d: 4 },
  { label: 'Yotoqxona', w: 4, d: 3.5 },
  { label: 'Oshxona', w: 3.5, d: 3 },
  { label: 'Hammom', w: 2.5, d: 2 },
  { label: "Yo'lak", w: 4, d: 1.5 },
  { label: 'Ish xonasi', w: 3.5, d: 3 },
  { label: 'Garaj', w: 5, d: 3 },
];

const EXTERIOR_TYPES: { kind: ExteriorKind; label: string }[] = [
  { kind: 'archa', label: 'Archa' },
  { kind: 'olma', label: 'Olma daraxti' },
  { kind: 'terak', label: 'Terak' },
  { kind: 'qayragoch', label: "Qayrag'och" },
  { kind: 'bush', label: 'Buta' },
  { kind: 'path', label: "Yo'lak" },
  { kind: 'fence', label: 'Panjara' },
  { kind: 'light', label: 'Yoritgich' },
];

const WALL_COLORS = ['#E8EEF7', '#D9C7A6', '#9FB4CC', '#C9D6E6', '#B98E6A'];
const ROOF_COLORS = ['#B03A4B', '#2F4A6B', '#3F6B4A', '#5C4037', '#29B6FF'];
const FLOOR_COLORS = ['#C9B08A', '#8A94A3', '#6E7E5A', '#A8B6C6'];

const INITIAL_STATE: PlannerState = {
  projectName: 'Yangi loyiha',
  rooms: [],
  items: [],
  wallColor: WALL_COLORS[0],
  roofColor: ROOF_COLORS[0],
  floorColor: FLOOR_COLORS[0],
  roofOn: true,
  night: false,
  floors: 1,
};

const snap = (v: number) => Math.round(v * 2) / 2;

/** 1–10 xonali tayyor uy shablonlari */
const TEMPLATE_LABELS = [
  'Mehmonxona', 'Oshxona', 'Yotoqxona', 'Yotoqxona', 'Hammom',
  "Yo'lak", 'Garaj', 'Ish xonasi', 'Yotoqxona', 'Hammom',
];

function makeHouse(n: number): PlannerState {
  const rooms: PlannerRoom[] = [];
  for (let i = 0; i < n; i++) {
    const label = TEMPLATE_LABELS[i % TEMPLATE_LABELS.length];
    const def = ROOM_TYPES.find((r) => r.label === label) || ROOM_TYPES[0];
    const col = i % 4;
    const row = Math.floor(i / 4);
    rooms.push({
      id: `t${n}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      name: label,
      w: def.w,
      d: def.d,
      x: snap(-9.5 + col * 6.5),
      z: snap(-6 + row * 5.5),
      door: true,
      windows: 1,
    });
  }
  return { ...INITIAL_STATE, projectName: `${n} xonali uy`, rooms, items: [] };
}

export function PlannerPage() {
  const { language, currentProject, projects, addProject, updateProject, orders } = useAppStore();
  const [state, setState] = useState<PlannerState>(INITIAL_STATE);
  const [mode, setMode] = useState<'3d' | '2d'>('3d');
  const [camView, setCamView] = useState('iso');
  const [zoomTick, setZoomTick] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [activeFloor, setActiveFloor] = useState(1); // qaysi qavatga xona qo'shilmoqda

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dz: number } | null>(null);
  const loadedIdRef = useRef<string | null>(null);

  const totalArea = state.rooms.reduce((sum, r) => sum + r.w * r.d, 0);
  const wallLength = state.rooms.reduce((sum, r) => sum + 2 * (r.w + r.d), 0);

  useEffect(() => {
    const id = currentProject?.id ?? null;
    if (loadedIdRef.current === id) return;
    loadedIdRef.current = id;
    if (currentProject?.planner) {
      setState({ ...currentProject.planner, projectName: currentProject.name });
      setSelected(null);
    } else if (currentProject) {
      setState((prev) => ({ ...prev, projectName: currentProject.name }));
    }
  }, [currentProject]);

  const addRoom = (label: string) => {
    const def = ROOM_TYPES.find((r) => r.label === label) || ROOM_TYPES[0];
    setState((prev) => {
      const maxX = prev.rooms.length ? Math.max(...prev.rooms.map((r) => r.x + r.w / 2)) : -def.w / 2;
      const room: PlannerRoom = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: label,
        w: def.w,
        d: def.d,
        x: snap(maxX + def.w / 2 + 1),
        z: 0,
        door: true,
        windows: 1,
        floor: activeFloor,
      };
      return { ...prev, rooms: [...prev.rooms, room] };
    });
    setSavedMsg(null);
  };

  const updateRoom = (id: string, patch: Partial<PlannerRoom>) =>
    setState((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));

  const removeRoom = (id: string) => {
    setState((prev) => ({ ...prev, rooms: prev.rooms.filter((r) => r.id !== id) }));
    setSelected((s) => (s === id ? null : s));
  };

  const addExterior = (kind: ExteriorKind) => {
    setState((prev) => {
      const n = prev.items.length;
      const angle = n * 1.05;
      const radius = 13 + (n % 3) * 2.5;
      const item: ExteriorItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kind,
        x: snap(Math.cos(angle) * radius),
        z: snap(Math.sin(angle) * radius),
      };
      return { ...prev, items: [...prev.items, item] };
    });
    setSavedMsg(null);
  };

  // Do'konda sotib olingan buyumlar (tayyor devor, tom, mebel, chiroq, yer)
  const propProducts = SHOP_ITEMS.filter((p) => p.propKind);
  const ownedProps = propProducts
    .map((p) => ({
      product: p,
      count: orders.reduce(
        (n, o) => n + (o.items.find((it) => it.productId === p.id)?.qty || 0),
        0
      ),
      placed: state.items.filter((i) => i.propProductId === p.id).length,
    }))
    .filter((c) => c.count > 0);

  const placeProp = (productId: string) => {
    const p = SHOP_ITEMS.find((x) => x.id === productId);
    if (!p?.propKind) return;
    setState((prev) => {
      const n = prev.items.length;
      const angle = n * 1.05;
      const radius = p.propKind === 'land' ? 15 : 10 + (n % 3) * 2.5;
      const item: ExteriorItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kind: 'prop',
        x: snap(Math.cos(angle) * radius),
        z: snap(Math.sin(angle) * radius),
        propKind: p.propKind,
        propColor: p.propColor,
        propName: p.name,
        propProductId: p.id,
      };
      return { ...prev, items: [...prev.items, item] };
    });
    setSavedMsg(null);
  };

  const removeExterior = (id: string) =>
    setState((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }));

  // Do'konda sotib olingan mashinalar (buyurtmalar tarixidan)
  const carProducts = SHOP_ITEMS.filter((p) => p.carBody);
  const ownedCars = carProducts
    .map((p) => ({
      product: p,
      count: orders.reduce(
        (n, o) => n + (o.items.find((it) => it.productId === p.id)?.qty || 0),
        0
      ),
      placed: state.items.filter((i) => i.carId === p.id).length,
    }))
    .filter((c) => c.count > 0);

  const placeCar = (productId: string) => {
    const p = SHOP_ITEMS.find((x) => x.id === productId);
    if (!p?.carBody) return;
    setState((prev) => {
      const n = prev.items.length;
      const angle = n * 1.05;
      const radius = 11 + (n % 3) * 2.5;
      const item: ExteriorItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kind: 'car',
        x: snap(Math.cos(angle) * radius),
        z: snap(Math.sin(angle) * radius),
        carId: p.id,
        carName: p.name,
        carBody: p.carBody,
        carColor: p.carColor,
      };
      return { ...prev, items: [...prev.items, item] };
    });
    setSavedMsg(null);
  };

  const svgPoint = (e: React.PointerEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { mx: 0, mz: 0 };
    return {
      mx: ((e.clientX - rect.left) / rect.width) * 40 - 20,
      mz: ((e.clientY - rect.top) / rect.height) * 40 - 20,
    };
  };

  const onRoomDown = (e: React.PointerEvent, room: PlannerRoom) => {
    const { mx, mz } = svgPoint(e);
    dragRef.current = { id: room.id, dx: room.x - mx, dz: room.z - mz };
    setSelected(room.id);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onRoomMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const { mx, mz } = svgPoint(e);
    updateRoom(drag.id, { x: snap(mx + drag.dx), z: snap(mz + drag.dz) });
  };

  const save = () => {
    const name = state.projectName.trim() || 'Yangi loyiha';
    const base = {
      name,
      area: Number(totalArea.toFixed(1)),
      roomCount: state.rooms.length,
      wallLength: Number(wallLength.toFixed(1)),
      updatedAt: new Date(),
      planner: { ...state, projectName: name },
    };
    if (currentProject) {
      updateProject({ ...currentProject, ...base });
      setSavedMsg(`"${name}" loyihasi yangilandi — Loyihalarim sahifasida saqlandi`);
    } else {
      const project: Project = {
        id: Date.now().toString(),
        description: '',
        createdAt: new Date(),
        ...base,
      };
      addProject(project);
      setSavedMsg(`"${name}" loyihasi saqlandi — Loyihalarim sahifasida ko'rish mumkin`);
    }
  };

  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  const selectedRoom = state.rooms.find((r) => r.id === selected) || null;
  const gridLines = [];
  for (let i = -20; i <= 20; i += 2) gridLines.push(i);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F8FF]">{t(language, 'planner')}</h1>
            <p className="text-sm text-[#9EB7D3]">{t(language, 'homePlannerDesc')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('3d')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === '3d' ? 'bg-[#1677FF] text-white' : 'bg-[#102943] text-[#9EB7D3] border border-[#174D78] hover:text-[#F5F8FF]'
              }`}
            >
              <Box className="w-4 h-4" /> 3D
            </button>
            <button
              onClick={() => setMode('2d')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === '2d' ? 'bg-[#1677FF] text-white' : 'bg-[#102943] text-[#9EB7D3] border border-[#174D78] hover:text-[#F5F8FF]'
              }`}
            >
              <Grid2x2 className="w-4 h-4" /> 2D
            </button>
            <Button variant="outline" size="sm" onClick={toggleFullscreen} aria-label="To'liq ekran">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* name + save */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            value={state.projectName}
            onChange={(e) => { setState((p) => ({ ...p, projectName: e.target.value })); setSavedMsg(null); }}
            placeholder="Loyiha nomi"
            aria-label="Loyiha nomi"
            className="flex-1 bg-[#102943] border border-[#174D78] rounded-lg text-[#F5F8FF] px-3 py-2.5 focus:outline-none focus:border-[#1677FF]"
          />
          <Button onClick={save}>
            <Save className="w-4 h-4 mr-2" /> {t(language, 'save')}
          </Button>
        </div>
        {savedMsg && <p className="text-sm text-[#22C99A] mb-3">{savedMsg}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* workspace */}
          <div className="lg:col-span-2">
            <div
              ref={wrapRef}
              className="relative h-[420px] md:h-[560px] rounded-2xl overflow-hidden border border-[#174D78] bg-[#050D18]"
            >
              {mode === '3d' ? (
                <HouseScene state={state} view={camView} zoomTick={zoomTick} />
              ) : (
                <svg
                  ref={svgRef}
                  viewBox="-20 -20 40 40"
                  className="w-full h-full touch-none select-none"
                  onPointerMove={onRoomMove}
                  onPointerUp={() => { dragRef.current = null; }}
                  onPointerLeave={() => { dragRef.current = null; }}
                >
                  <rect x={-20} y={-20} width={40} height={40} fill="#0A1D33" />
                  {gridLines.map((i) => (
                    <g key={i} stroke="#174D78" strokeWidth={0.05} opacity={0.7}>
                      <line x1={-20} y1={i} x2={20} y2={i} />
                      <line x1={i} y1={-20} x2={i} y2={20} />
                    </g>
                  ))}
                  <line x1={-20} y1={0} x2={20} y2={0} stroke="#29B6FF" strokeWidth={0.08} opacity={0.5} />
                  <line x1={0} y1={-20} x2={0} y2={20} stroke="#29B6FF" strokeWidth={0.08} opacity={0.5} />

                  {state.rooms
                    .filter((r) => (r.floor ?? 1) === activeFloor)
                    .map((r) => (
                      <g key={r.id}>
                      <rect
                        x={r.x - r.w / 2}
                        y={r.z - r.d / 2}
                        width={r.w}
                        height={r.d}
                        fill={selected === r.id ? 'rgba(22,119,255,0.35)' : 'rgba(22,119,255,0.15)'}
                        stroke={selected === r.id ? '#29B6FF' : '#174D78'}
                        strokeWidth={0.12}
                        style={{ cursor: 'move' }}
                        onPointerDown={(e) => onRoomDown(e, r)}
                      />
                      <text x={r.x} y={r.z} fontSize={0.9} fill="#F5F8FF" textAnchor="middle" pointerEvents="none">
                        {r.name}
                      </text>
                      <text x={r.x} y={r.z + 1.1} fontSize={0.7} fill="#9EB7D3" textAnchor="middle" pointerEvents="none">
                        {(r.w * r.d).toFixed(1)} m²
                      </text>
                    </g>
                  ))}

                  {state.items.map((it) => (
                    <g key={it.id} transform={`translate(${it.x} ${it.z})`}>
                      <rect
                        x={it.kind === 'car' || it.kind === 'prop' ? -1.1 : -0.7}
                        y={it.kind === 'car' || it.kind === 'prop' ? -0.55 : -0.7}
                        width={it.kind === 'car' || it.kind === 'prop' ? 2.2 : 1.4}
                        height={it.kind === 'car' || it.kind === 'prop' ? 1.1 : 1.4}
                        rx={it.kind === 'car' || it.kind === 'prop' ? 0.3 : 0.7}
                        fill={
                          it.kind === 'car'
                            ? it.carColor || '#C9CFD8'
                            : it.kind === 'prop'
                            ? it.propColor || '#9AA3AD'
                            : it.kind === 'light'
                            ? '#FFD54F'
                            : it.kind === 'fence'
                            ? '#A9743F'
                            : '#22C99A'
                        }
                        opacity={0.9}
                      />
                    </g>
                  ))}
                </svg>
              )}

              <div className="absolute top-3 left-3 text-[11px] px-2.5 py-1.5 rounded-lg bg-[#061426]/80 border border-[#174D78] text-[#9EB7D3] pointer-events-none max-w-[70%]">
                {mode === '3d'
                  ? "Sichqoncha: aylantish · G'ildirak: yaqinlashtirish · Shift: siljitish"
                  : 'Xonani bosib sirab joylashtiring, o\'lchamlarni o\'ng paneldan o\'zgartiring'}
              </div>

              {mode === '3d' && (
                <div className="absolute bottom-3 right-3 flex flex-col gap-2">
                  <button
                    onClick={() => setZoomTick((v) => v + 1)}
                    aria-label="Yaqinlashtirish"
                    className="w-9 h-9 rounded-lg bg-[#0A1D33]/90 border border-[#174D78] text-[#F5F8FF] hover:border-[#1677FF] flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZoomTick((v) => v - 1)}
                    aria-label="Uzoqlashtirish"
                    className="w-9 h-9 rounded-lg bg-[#0A1D33]/90 border border-[#174D78] text-[#F5F8FF] hover:border-[#1677FF] flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setCamView('reset'); setTimeout(() => setCamView('iso'), 0); }}
                    aria-label={t(language, 'resetCamera')}
                    className="w-9 h-9 rounded-lg bg-[#0A1D33]/90 border border-[#174D78] text-[#F5F8FF] hover:border-[#1677FF] flex items-center justify-center"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 mt-3">
              <Card className="p-4">
                <p className="text-xs text-[#6B7C93] mb-1">{t(language, 'areaLabel')}</p>
                <p className="text-lg font-bold text-[#29B6FF]">{totalArea.toFixed(1)} m²</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-[#6B7C93] mb-1">{t(language, 'roomsLabel')}</p>
                <p className="text-lg font-bold text-[#29B6FF]">{state.rooms.length}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-[#6B7C93] mb-1">Devor uzunligi</p>
                <p className="text-lg font-bold text-[#29B6FF]">{wallLength.toFixed(1)} m</p>
              </Card>
            </div>
          </div>

          {/* right panels */}
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold text-[#F5F8FF] mb-1">Tayyor uy loyihasi</h3>
              <p className="text-[11px] text-[#6B7C93] mb-3">
                1 dan 10 xonagacha tayyor reja — bosish bilan quring
              </p>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setState((prev) => ({ ...makeHouse(n), items: prev.items }));
                      setSavedMsg(null);
                      setSelected(null);
                      setActiveFloor(1);
                    }}
                    className="px-1 py-2 rounded-lg bg-[#0A1D33] border border-[#174D78] text-[#9EB7D3] text-xs hover:text-[#F5F8FF] hover:border-[#1677FF] transition-colors"
                    title={`${n} xonali uy loyihasini yaratish`}
                  >
                    {n}✕
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-[#F5F8FF] mb-1">Qavatlar</h3>
              <p className="text-[11px] text-[#6B7C93] mb-3">
                3 qavatgacha — har bir qavatga alohida xona qo'shib, o'zingizca quring
              </p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[1, 2, 3].map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setState((p) => ({ ...p, floors: Math.max(p.floors || 1, f) }));
                      setActiveFloor(f);
                    }}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      activeFloor === f
                        ? 'bg-[#1677FF]/20 text-[#29B6FF] border-[#1677FF]/50'
                        : 'bg-[#0A1D33] text-[#9EB7D3] border-[#174D78] hover:text-[#F5F8FF]'
                    }`}
                  >
                    {f}-qavat
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#9EB7D3]">Qavatlar soni</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const nf = Math.max(1, (state.floors || 1) - 1);
                      setState((p) => ({ ...p, floors: nf }));
                      setActiveFloor((a) => Math.min(a, nf));
                    }}
                    aria-label="Qavat kamaytirish"
                    className="w-7 h-7 rounded border border-[#174D78] text-[#9EB7D3] hover:text-[#F5F8FF] flex items-center justify-center"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-5 text-center text-sm font-semibold text-[#F5F8FF]">{state.floors || 1}</span>
                  <button
                    onClick={() => setState((p) => ({ ...p, floors: Math.min(3, (p.floors || 1) + 1) }))}
                    aria-label="Qavat ko'paytirish"
                    className="w-7 h-7 rounded border border-[#174D78] text-[#9EB7D3] hover:text-[#F5F8FF] flex items-center justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-[#6B7C93] mt-2">
                Hozir {activeFloor}-qavatga xona qo'shilmoqda · jami {state.floors || 1} qavat
              </p>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-[#F5F8FF] mb-3">Xona qo'shish</h3>
              <div className="grid grid-cols-2 gap-2">
                {ROOM_TYPES.map((rt) => (
                  <button
                    key={rt.label}
                    onClick={() => addRoom(rt.label)}
                    className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg bg-[#0A1D33] border border-[#174D78] text-[#9EB7D3] text-xs hover:text-[#F5F8FF] hover:border-[#1677FF] transition-colors"
                  >
                    <House className="w-4 h-4 text-[#1677FF]" />
                    <span className="text-center leading-tight">{rt.label}</span>
                    <span className="text-[10px] text-[#6B7C93]">{rt.w}×{rt.d} m</span>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-[#F5F8FF] mb-3">Xonalar ({state.rooms.length})</h3>
              {state.rooms.length === 0 ? (
                <p className="text-sm text-[#6B7C93] text-center py-4">Xona qo'shilmagan</p>
              ) : (
                <div className="space-y-2">
                  {state.rooms.map((r) => (
                    <div
                      key={r.id}
                      className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border transition-colors ${
                        selected === r.id
                          ? 'bg-[#1677FF]/15 border-[#1677FF]/50'
                          : 'bg-[#0A1D33] border-[#174D78]'
                      }`}
                    >
                      <button onClick={() => setSelected(r.id)} className="flex-1 text-left min-w-0">
                        <span className="block text-sm text-[#F5F8FF] truncate">{r.name}</span>
                        <span className="block text-[11px] text-[#6B7C93]">
                          {r.w}×{r.d} m · {(r.w * r.d).toFixed(1)} m²
                        </span>
                      </button>
                      <button
                        onClick={() => removeRoom(r.id)}
                        aria-label={t(language, 'delete')}
                        className="text-[#6B7C93] hover:text-red-400 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {selectedRoom && (
              <Card className="p-4 border-[#1677FF]/50">
                <h3 className="font-semibold text-[#F5F8FF] mb-3">{selectedRoom.name} — sozlamalar</h3>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <label className="text-xs text-[#9EB7D3]">
                    Eni (m)
                    <input
                      type="number"
                      min={1}
                      max={40}
                      step={0.5}
                      value={selectedRoom.w}
                      onChange={(e) =>
                        updateRoom(selectedRoom.id, { w: Math.min(40, Math.max(1, Number(e.target.value) || 1)) })
                      }
                      className="mt-1 w-full bg-[#0A1D33] border border-[#174D78] rounded-lg text-[#F5F8FF] px-2 py-1.5 text-sm focus:outline-none focus:border-[#1677FF]"
                    />
                  </label>
                  <label className="text-xs text-[#9EB7D3]">
                    Uzunligi (m)
                    <input
                      type="number"
                      min={1}
                      max={40}
                      step={0.5}
                      value={selectedRoom.d}
                      onChange={(e) =>
                        updateRoom(selectedRoom.id, { d: Math.min(40, Math.max(1, Number(e.target.value) || 1)) })
                      }
                      className="mt-1 w-full bg-[#0A1D33] border border-[#174D78] rounded-lg text-[#F5F8FF] px-2 py-1.5 text-sm focus:outline-none focus:border-[#1677FF]"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#9EB7D3]">Eshik</span>
                  <button
                    onClick={() => updateRoom(selectedRoom.id, { door: !selectedRoom.door })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      selectedRoom.door
                        ? 'bg-[#1677FF]/20 text-[#29B6FF] border-[#1677FF]/50'
                        : 'bg-[#0A1D33] text-[#6B7C93] border-[#174D78]'
                    }`}
                  >
                    {selectedRoom.door ? 'Yoqilgan' : "O'chiq"}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#9EB7D3]">Deraza soni</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateRoom(selectedRoom.id, { windows: Math.max(0, selectedRoom.windows - 1) })}
                      aria-label="-"
                      className="w-7 h-7 rounded border border-[#174D78] text-[#9EB7D3] hover:text-[#F5F8FF] flex items-center justify-center"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold text-[#F5F8FF]">{selectedRoom.windows}</span>
                    <button
                      onClick={() => updateRoom(selectedRoom.id, { windows: Math.min(4, selectedRoom.windows + 1) })}
                      aria-label="+"
                      className="w-7 h-7 rounded border border-[#174D78] text-[#9EB7D3] hover:text-[#F5F8FF] flex items-center justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-4">
              <h3 className="font-semibold text-[#F5F8FF] mb-3">Hovli elementlari</h3>
              <div className="grid grid-cols-2 gap-2">
                {EXTERIOR_TYPES.map((ex) => (
                  <button
                    key={ex.kind}
                    onClick={() => addExterior(ex.kind)}
                    className="px-2 py-2 rounded-lg bg-[#0A1D33] border border-[#174D78] text-[#9EB7D3] text-xs hover:text-[#F5F8FF] hover:border-[#1677FF] transition-colors"
                  >
                    + {ex.label}
                  </button>
                ))}
              </div>
              {state.items.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {state.items.map((it) => {
                    const label =
                      it.kind === 'car'
                        ? it.carName || 'Mashina'
                        : it.kind === 'prop'
                        ? it.propName || 'Buyum'
                        : EXTERIOR_TYPES.find((e) => e.kind === it.kind)?.label || it.kind;
                    return (
                      <span
                        key={it.id}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-[#102943] border border-[#174D78] text-[#9EB7D3]"
                      >
                        {label}
                        <button
                          onClick={() => removeExterior(it.id)}
                          aria-label={t(language, 'delete')}
                          className="text-[#6B7C93] hover:text-red-400"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-[#F5F8FF] mb-1 flex items-center gap-2">
                <CarIcon className="w-4 h-4 text-[#29B6FF]" /> Mashinalarim
              </h3>
              <p className="text-[11px] text-[#6B7C93] mb-3">
                Do'kondan sotib olingan mashinalar hovliga 3D qo'yiladi
              </p>
              {ownedCars.length === 0 ? (
                <p className="text-sm text-[#6B7C93] text-center py-3">
                  Hali mashina sotib olinmagan — Do'kondan «Moshinalar» bo'limidan xarid qiling
                </p>
              ) : (
                <div className="space-y-2">
                  {ownedCars.map(({ product, count, placed }) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#0A1D33] border border-[#174D78]"
                    >
                      <div className="min-w-0">
                        <span className="block text-sm text-[#F5F8FF] truncate">{product.name}</span>
                        <span className="block text-[11px] text-[#6B7C93]">
                          Xarid: {count} ta · Hovlida: {placed} ta
                        </span>
                      </div>
                      <button
                        onClick={() => placeCar(product.id)}
                        disabled={placed >= count}
                        className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#1677FF]/15 text-[#29B6FF] border border-[#1677FF]/50 hover:bg-[#1677FF]/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title={placed >= count ? 'Barcha sotib olingan mashinalar hovlida' : "Hovliga qo'yish"}
                      >
                        + Hovliga
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-[#F5F8FF] mb-1 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#22C99A]" /> Xarid qilingan buyumlar
              </h3>
              <p className="text-[11px] text-[#6B7C93] mb-3">
                Do'kondan sotib olingan tayyor devor, tom, chiroq va mebel — hovlingizga 3D qo'yiladi
              </p>
              {ownedProps.length === 0 ? (
                <p className="text-sm text-[#6B7C93] text-center py-3">
                  Hali buyum sotib olinmagan — Do'kondan «Tayyor devor», «Mebel» va boshqa bo'limlardan xarid qiling
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {ownedProps.map(({ product, count, placed }) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#0A1D33] border border-[#174D78]"
                    >
                      <div className="min-w-0">
                        <span className="block text-sm text-[#F5F8FF] truncate">{product.name}</span>
                        <span className="block text-[11px] text-[#6B7C93]">
                          Xarid: {count} ta · Hovlida: {placed} ta
                        </span>
                      </div>
                      <button
                        onClick={() => placeProp(product.id)}
                        disabled={placed >= count}
                        className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#22C99A]/15 text-[#8FF3D6] border border-[#22C99A]/50 hover:bg-[#22C99A]/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title={placed >= count ? 'Barcha xarid qilingan buyumlar hovlida' : "Hovliga qo'yish"}
                      >
                        + Hovliga
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-[#F5F8FF] mb-3">Ko'rinish va materiallar</h3>
              {[
                { label: 'Devor rangi', colors: WALL_COLORS, cur: state.wallColor, key: 'wallColor' as const },
                { label: 'Tom rangi', colors: ROOF_COLORS, cur: state.roofColor, key: 'roofColor' as const },
                { label: 'Pol rangi', colors: FLOOR_COLORS, cur: state.floorColor, key: 'floorColor' as const },
              ].map((row) => (
                <div key={row.label} className="mb-3">
                  <p className="text-xs text-[#9EB7D3] mb-1.5">{row.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {row.colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => setState((p) => ({ ...p, [row.key]: c }))}
                        aria-label={`${row.label}: ${c}`}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          row.cur === c ? 'border-[#29B6FF] scale-110' : 'border-[#174D78]'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#9EB7D3]">Tom</span>
                <button
                  onClick={() => setState((p) => ({ ...p, roofOn: !p.roofOn }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    state.roofOn
                      ? 'bg-[#1677FF]/20 text-[#29B6FF] border-[#1677FF]/50'
                      : 'bg-[#0A1D33] text-[#6B7C93] border-[#174D78]'
                  }`}
                >
                  {state.roofOn ? 'Yoqilgan' : "O'chiq"}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-[#9EB7D3]">Yoritish</span>
                <button
                  onClick={() => setState((p) => ({ ...p, night: !p.night }))}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border bg-[#0A1D33] border-[#174D78] text-[#9EB7D3] hover:text-[#F5F8FF] hover:border-[#1677FF] transition-colors"
                >
                  {state.night ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-[#FFD54F]" /> Kunduzga o'tish
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-[#29B6FF]" /> Tungi rejim
                    </>
                  )}
                </button>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-[#F5F8FF] mb-3">Kamera burchagi</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { l: 'Isometrik', v: 'iso' },
                  { l: 'Yuqori', v: 'top' },
                  { l: 'Yon', v: 'side' },
                  { l: 'Old', v: 'front' },
                ].map((b) => (
                  <button
                    key={b.v}
                    onClick={() => setCamView(b.v)}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      camView === b.v
                        ? 'bg-[#1677FF]/20 text-[#29B6FF] border-[#1677FF]/50'
                        : 'bg-[#0A1D33] text-[#9EB7D3] border-[#174D78] hover:text-[#F5F8FF]'
                    }`}
                  >
                    {b.l}
                  </button>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-2" size="sm" onClick={() => setCamView('reset')}>
                <RotateCcw className="w-4 h-4 mr-2" /> {t(language, 'resetCamera')}
              </Button>
              <p className="text-[11px] text-[#6B7C93] mt-2">
                Sichqoncha bilan aylantiring, g'ildirak bilan yaqinlashtiring. Kamera masofasi cheklangan — uy
                ekrandan yo'qolib ketmaydi.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
