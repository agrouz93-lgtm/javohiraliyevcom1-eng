import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store';
import { t } from '@/translations';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useNav } from '@/context/NavContext';
import { RotateCcw, Circle, AlertCircle, ScanSearch } from 'lucide-react';

interface Point { x: number; y: number; label: string; }
interface WallLine { p1: Point; p2: Point; lengthM: number; }

type MeasureMode = 'room' | 'wall' | 'floor' | 'exterior' | 'manual' | 'volume';

export function CameraPage() {
  const { language, unit, addMeasurement, measurements, setPendingCountImage } = useAppStore();
  const { setActivePage } = useNav();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [walls, setWalls] = useState<WallLine[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [measuring, setMeasuring] = useState(false);
  const [measureMode, setMeasureMode] = useState<MeasureMode | null>(null);
  const [saved, setSaved] = useState(false);
  const [manualLen, setManualLen] = useState('');
  const [manualWid, setManualWid] = useState('');
  const [manualHeight, setManualHeight] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
const MEASUREMENT_MODES = ['room', 'wall', 'floor', 'exterior', 'manual', 'volume'] as const;
const MANUAL_MEASURE_MODES = ['room', 'wall', 'floor', 'volume'] as const;
  const [mPerPixel, setMPixel] = useState(0.005); // calibrated scale: metres per pixel (adjust with a known object)

  useEffect(() => {
    initCamera();
    return () => { if (stream) stream.getTracks().forEach((t) => t.stop()); };
  }, [facingMode]);

  const initCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setIsSupported(false);
        setError('Kamera mavjud emas');
        return;
      }
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: 1280, height: 720 } });
      setStream(s);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Kamera ruxsati rad etildi');
      setIsSupported(false);
    }
  };

  const switchCamera = () => setFacingMode((p) => (p === 'user' ? 'environment' : 'user'));

  const capturePhoto = () => {
    if (!videoRef.current || !stream) return;
    const canvas = document.createElement('canvas');
    const v = videoRef.current;
    canvas.width = v.videoWidth || 640;
    canvas.height = v.videoHeight || 480;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(v, 0, 0);
    setCaptured(canvas.toDataURL('image/jpeg'));
    setImgDims({ w: canvas.width, h: canvas.height });
    setWalls([]); setPoints([]);
  };

  const uploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Iltimos, rasm faylini yuklang');
      return;
    }
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      setCaptured(url);
      setImgDims({ w: im.naturalWidth, h: im.naturalHeight });
      setWalls([]);
      setPoints([]);
      setError(null);
    };
    im.onerror = () => setError("Rasmni o'qib bo'lmadi");
    im.src = url;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!measuring || !captured || !imgDims || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (imgDims.w / rect.width);
    const y = (e.clientY - rect.top) * (imgDims.h / rect.height);
    const clampedX = Math.max(0, Math.min(imgDims.w, x));
    const clampedY = Math.max(0, Math.min(imgDims.h, y));
    const label = `${points.length}`;
    const newPoint = { x: clampedX, y: clampedY, label };
    setPoints((prev) => [...prev, newPoint]);
    if (points.length > 0) {
      const last = points[points.length - 1];
      addWall(last, newPoint);
    }
  };
  const addWall = (p1: Point, p2: Point) => {
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const distPx = Math.sqrt(dx * dx + dy * dy);
    const lengthM = distPx * mPerPixel;
    const id = Date.now().toString();
    setWalls((prev) => [...prev, { p1, p2, lengthM }]);
    setPoints((prev) => [...prev, { ...p1, label: p1.label || id }, { ...p2, label: p2.label || id }]);
  };

  const clearMeasurements = () => { setWalls([]); setPoints([]); };

  const totalLength = walls.reduce((s, w) => s + w.lengthM, 0);
  const area = (() => {
    // rough polygon area from wall endpoints (shoelace on unique points) - demo approximation
    const pts = walls.flatMap(w => [w.p1, w.p2]);
    if (pts.length < 3) return 0;
    let sum = 0;
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i], p2 = pts[(i + 1) % pts.length];
      sum += p1.x * p2.y - p2.x * p1.y;
    }
    return Math.abs(sum) / 2 * mPerPixel * mPerPixel;
  })();
  const perimeter = totalLength;
  const roomCount = Math.max(1, Math.floor(walls.length / 4));

  const saveMeasurement = useCallback(() => {
    const m = {
      id: Date.now().toString(),
      type: 'manual' as const,
      length: Number(manualLen || totalLength),
      width: Number(manualWid || area ? Math.sqrt(area) : 0),
      area: area || Number(manualLen || 0) * Number(manualWid || 0),
      perimeter,
      unit,
      image: captured ?? undefined,
      createdAt: new Date(),
    };
    addMeasurement(m);
    setSaved(true);
  }, [manualLen, manualWid, totalLength, area, perimeter, unit, captured, addMeasurement]);

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-[#061426] flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="w-12 h-12 text-[#FF6B6B] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#F5F8FF] mb-2">{t(language, 'camera')}</h2>
          <p className="text-[#9EB7D3] mb-4">{error || 'Kamera qo\'llab-quvvatlanmaydi'}</p>
          <p className="text-[#6B7C93] text-sm mb-6">AR o'lchash qurilma tomonidan qo'llab-quvvatlanmasa, quyidagi rejimdan foydalaning:</p>
          <div className="space-y-2">
            <Button className="w-full" onClick={() => { setManualLen(''); setManualWid(''); setMeasureMode('manual'); }}>
              {t(language, 'measureManual')}
            </Button>
            <Button variant="outline" className="w-full" onClick={switchCamera}>
              {t(language, 'switchCamera')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#061426]">
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-[#F5F8FF]">{t(language, 'camera')}</h1>
          <div className="flex gap-2 flex-wrap">
            <input
              id="camera-upload"
              type="file"
              accept="image/*"
              onChange={uploadPhoto}
              className="hidden"
            />
            <label
              htmlFor="camera-upload"
              className="cursor-pointer bg-[#102943] border border-[#174D78] text-[#F5F8FF] text-sm font-medium px-3 py-1.5 rounded-lg hover:border-[#1677FF] transition-colors"
            >
              {t(language, 'uploadImage')}
            </label>
            <Button variant="outline" size="sm" onClick={switchCamera}>
              <RotateCcw className="w-4 h-4 mr-1" /> {t(language, 'switchCamera')}
            </Button>
            {!captured && (
              <Button variant="outline" size="sm" disabled={!stream} onClick={() => { setMeasureMode(null); setWalls([]); setPoints([]); }}>
                {t(language, 'measureManual')}
              </Button>
            )}
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-[#102943] border border-[#174D78] rounded-lg px-3 py-2 text-xs text-[#9EB7D3]">
          <span>{t(language, 'approxNote')}</span>
          <label className="flex items-center gap-2">
            {t(language, 'scaleLabel')}
            <input
              type="number"
              step="0.0005"
              min="0.0001"
              value={mPerPixel}
              onChange={(e) => setMPixel(Math.max(0.0001, Number(e.target.value) || 0.005))}
              className="w-28 bg-[#0A1D33] border border-[#174D78] rounded text-[#F5F8FF] px-2 py-1 focus:outline-none focus:border-[#1677FF]"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div
  ref={overlayRef}
  onPointerDown={handlePointerDown}
  className="relative rounded-2xl overflow-hidden border border-[#174D78] shadow-2xl aspect-video bg-black">
              {captured ? (
                <>
                  <img src={captured} alt="Captured" className="w-full h-full object-cover block" />
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    width={imgDims?.w ?? 640}
                    height={imgDims?.h ?? 480}
                  >
                    <defs>
                      <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L9,3 z" fill="#1677FF" />
                      </marker>
                    </defs>
                    {walls.map((w, i) => (
                      <g key={i}>
                        <line
                          x1={w.p1.x} y1={w.p1.y} x2={w.p2.x} y2={w.p2.y}
                          stroke="#29B6FF" strokeWidth="3" strokeDasharray="6 4"
                          marker-start="url(#arrow)" marker-end="url(#arrow)"
                        />
                        <text
                          x={(w.p1.x + w.p2.x) / 2} y={(w.p1.y + w.p2.y) / 2 - 8}
                          fill="#29B6FF" fontSize="12" fontWeight="700" textAnchor="middle"
                          stroke="#000" strokeWidth="3" paint-order="stroke"
                        >
                          {w.lengthM.toFixed(2)} m
                        </text>
                      </g>
                    ))}
                    {points.map((p) => (
                      <circle
                        key={p.label}
                        cx={p.x} cy={p.y} r="6" fill="#1677FF" stroke="#fff" strokeWidth="2"
                      />
                    ))}
                  </svg>
                  {!measuring && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
                      <div className="flex gap-2">
{MEASUREMENT_MODES.map((key) => (
                          <Button
                            key={key}
                            variant="outline"
                            size="sm"
                            active={measureMode === key}
                            className="px-4 py-2 text-sm"
                            onClick={() => {
                              setMeasureMode(key);
                              setMeasuring(true);
                            }}
                          >
                            {t(language, 'measure' + key.charAt(0).toUpperCase() + key.slice(1))}
                          </Button>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" onClick={clearMeasurements}>
                        Tozalash
                      </Button>
                      <Button className="w-12 h-12 rounded-full bg-[#22C99A] flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.4)]" onClick={capturePhoto}>
                        <Circle className="w-6 h-6 text-white" />
                      </Button>
                    </div>
                  )}
                  {measuring && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                      <span className="text-[#22C99A] text-sm font-medium">{String(measureMode)}</span>
                      <Button variant="outline" size="sm" onClick={() => setMeasuring(false)}>Bekor</Button>
                    </div>
                  )}
                </>
              ) : (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                  className="w-full h-full"
                />
              )}
              {!captured && stream && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
                  <button
                    onClick={capturePhoto}
                    className="w-14 h-14 rounded-full bg-white border-4 border-[#1677FF] flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                  >
                    <Circle className="w-8 h-8" />
                  </button>
                  <Button variant="outline" size="sm" onClick={() => setCaptured(null)}>Qaytadan</Button>
                </div>
              )}
              {captured && !saved && (
                <div className="absolute top-4 right-4 bg-[#061426]/80 backdrop-blur border border-[#174D78] rounded-xl p-3">
                  <div className="flex justify-between text-[10px] text-[#9EB7D3] mb-1">
                    <span>{t(language, 'area')}</span><span className="text-[#F5F8FF] font-bold">{area.toFixed(2)} m²</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-[#9EB7D3] mb-1">
                    <span>{t(language, 'perimeter')}</span><span className="text-[#F5F8FF] font-bold">{perimeter.toFixed(2)} m</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-[#9EB7D3]">
                    <span>{t(language, 'roomsLabel')}</span><span className="text-[#F5F8FF] font-bold">{roomCount}</span>
                  </div>
                  <div className="mt-2 p-2 rounded bg-[#1677FF]/10 border-[#1677FF]/30 text-[10px] text-[#29B6FF]">
                    Natija taxminiy (AR kalibratsiya qilmasdan)
                  </div>
                </div>
              )}
            </div>
            {!captured && (
              <div className="mt-6 grid grid-cols-3 gap-4">
{MANUAL_MEASURE_MODES.map((key) => (
                  <Card key={key} className="p-4 text-center cursor-pointer hover:border-[#1677FF]/50 transition-colors" onClick={() => { setMeasureMode(key); setMeasuring(true); }}>
                    <div className="w-6 h-6 bg-[#1677FF]/20 rounded mx-auto mb-2" />
                    <p className="text-xs text-[#9EB7D3]">{t(language, 'measure' + key.charAt(0).toUpperCase() + key.slice(1))}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-5">
              <h3 className="text-[#F5F8FF] font-semibold mb-4">Qonda o'lchash</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#9EB7D3] mb-2">Uzunlik (m)</label>
                  <input type="number" value={manualLen} onChange={(e) => setManualLen(e.target.value)} className="w-full bg-[#0A1D33] border border-[#174D78] rounded-lg text-[#F5F8FF] px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-[#9EB7D3] mb-2">Eni (m)</label>
                  <input type="number" value={manualWid} onChange={(e) => setManualWid(e.target.value)} className="w-full bg-[#0A1D33] border border-[#174D78] rounded-lg text-[#F5F8FF] px-3 py-2" />
                </div>
  <div>
    <label className="block text-sm text-[#9EB7D3] mb-2">Balandlik (m)</label>
    <input type="number" value={manualHeight} onChange={(e) => setManualHeight(e.target.value)} className="w-full bg-[#0A1D33] border border-[#174D78] rounded-lg text-[#F5F8FF] px-3 py-2" />
  </div>
                <Button className="w-full" disabled={saved} onClick={saveMeasurement}>
                  {saved ? 'Saqlandi' : t(language, 'saveMeasurement')}
                </Button>
                <Button
                  className="w-full mt-2 bg-[#7C5CFF] hover:bg-[#8B6CFF]"
                  disabled={!captured}
                  onClick={() => {
                    if (!captured) return;
                    setPendingCountImage(captured);
                    setActivePage('counter');
                  }}
                  title="Tushirilgan rasmni AI Sanashda obyektlarni sanash uchun yuborish"
                >
                  <ScanSearch className="w-4 h-4 mr-2" /> AI Sanashga yuborish
                </Button>
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="text-[#F5F8FF] font-semibold mb-4">Natijalar</h3>
              <div className="space-y-3">
                <div className="flex justify-between p-3 rounded-lg bg-[#102943] border border-[#174D78]">
                  <span className="text-[#9EB7D3] text-sm">{t(language, 'perimeter')}</span>
                  <span className="text-[#F5F8FF] font-bold text-sm">{perimeter.toFixed(2)} m</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-[#102943] border border-[#22C99A]/20">
                  <span className="text-[#9EB7D3] text-sm">{t(language, 'area')}</span>
                  <span className="text-[#F5F8FF] font-bold text-sm">{area.toFixed(2)} m²</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-[#102943] border border-[#1677FF]/20">
                  <span className="text-[#9EB7D3] text-sm">{t(language, 'roomsLabel')}</span>
                  <span className="text-[#F5F8FF] font-bold text-sm">{roomCount}</span>
                </div>
                {measureMode === 'floor' || measureMode === 'volume' ? (
                  <div className="flex justify-between p-3 rounded-lg bg-[#0A1D33] border border-[#22C99A]/20">
                    <span className="text-[#9EB7D3] text-sm">{t(language, 'volume')}</span>
                    <span className="text-[#F5F8FF] font-bold text-sm">{manualHeight ? (area * Number(manualHeight)).toFixed(2) : '0.00'} m³</span>
                  </div>
                ) : null}
              </div>
              <p className="text-[10px] text-[#6B7C93] mt-3">O'lchovlar AR kalibratsiya orqali aniqlanmagan holda taxminiy hisoblanadi.</p>
            </Card>
            <div className="space-y-2">
              {measurements.map((m) => (
                <Card key={m.id} className="p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-[#F5F8FF] font-medium text-sm">{m.type}</div>
                      <div className="text-[#9EB7D3] text-xs">{new Date(m.createdAt).toLocaleString()}</div>
                    </div>
                    <span className="text-[#29B6FF] font-bold text-xs">{m.area.toFixed(1)} m²</span>
                  </div>
                </Card>
              ))}
              {measurements.length === 0 && (
                <p className="text-[#6B7C93] text-sm text-center">Saqlangan o'lchovlar yo'q</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );


  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
}
