import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '@/store';
import { t } from '@/translations';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useNav } from '@/context/NavContext';
import {
  Image as ImageIcon, RefreshCw, Camera as CameraIcon,
  CheckCircle2, Info, Plus, Minus,
} from 'lucide-react';

interface Box { x: number; y: number; w: number; h: number; }

/** Real local analysis: background-estimation + colour-distance thresholding + connected-component labelling. */
async function analyzeImage(
  url: string,
  sensitivity: number
): Promise<{ count: number; boxes: Box[]; width: number; height: number }> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi"));
    img.src = url;
  });

  const maxW = 480;
  const scale = Math.min(1, maxW / img.naturalWidth);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas mavjud emas');
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  // background estimate: average colour of the four corner patches
  const patch = Math.max(4, Math.floor(Math.min(w, h) / 40));
  let br = 0, bg = 0, bb = 0, n = 0;
  const corners = [
    [0, 0], [w - patch, 0], [0, h - patch], [w - patch, h - patch],
  ];
  for (const [cx, cy] of corners) {
    for (let y = cy; y < cy + patch; y++) {
      for (let x = cx; x < cx + patch; x++) {
        const i = (y * w + x) * 4;
        br += data[i]; bg += data[i + 1]; bb += data[i + 2]; n++;
      }
    }
  }
  br /= n; bg /= n; bb /= n;

  // binary mask: pixels that differ from the background
  const mask = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const dr = data[i] - br;
    const dg = data[i + 1] - bg;
    const db = data[i + 2] - bb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    mask[p] = dist > sensitivity ? 1 : 0;
  }

  // connected components (4-neighbour flood fill)
  const labels = new Int32Array(w * h).fill(0);
  const boxes: Box[] = [];
  const stack: number[] = [];
  const minArea = Math.max(24, Math.floor((w * h) / 3500));
  let label = 0;

  for (let p = 0; p < mask.length; p++) {
    if (!mask[p] || labels[p]) continue;
    label++;
    let minX = w, minY = h, maxX = 0, maxY = 0, area = 0;
    stack.length = 0;
    stack.push(p);
    labels[p] = label;
    while (stack.length) {
      const cur = stack.pop()!;
      const x = cur % w;
      const y = (cur - x) / w;
      area++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0 && mask[cur - 1] && !labels[cur - 1]) { labels[cur - 1] = label; stack.push(cur - 1); }
      if (x < w - 1 && mask[cur + 1] && !labels[cur + 1]) { labels[cur + 1] = label; stack.push(cur + 1); }
      if (y > 0 && mask[cur - w] && !labels[cur - w]) { labels[cur - w] = label; stack.push(cur - w); }
      if (y < h - 1 && mask[cur + w] && !labels[cur + w]) { labels[cur + w] = label; stack.push(cur + w); }
    }
    if (area >= minArea) {
      boxes.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
    }
  }

  return { count: boxes.length, boxes, width: w, height: h };
}

const TYPE_PRESETS: Record<string, { label: string; sensitivity: number }> = {
  brick: { label: "G'isht va vint", sensitivity: 45 },
  tile: { label: 'Kafel', sensitivity: 60 },
  tools: { label: 'Qurilish jihozlari', sensitivity: 65 },
  other: { label: 'Boshqa obyektlar', sensitivity: 70 },
};

export function CounterPage() {
  const { language, pendingCountImage, setPendingCountImage } = useAppStore();
  const { setActivePage } = useNav();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [objectType, setObjectType] = useState('brick');
  const [sensitivity, setSensitivity] = useState(45);
  const [count, setCount] = useState(0);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Iltimos, rasm faylini yuklang');
      return;
    }
    setImageUrl(URL.createObjectURL(file));
    setBoxes([]);
    setCount(0);
    setConfirmedCount(0);
    setImgSize(null);
    setError(null);
  };

  const pickType = (value: string) => {
    setObjectType(value);
    setSensitivity(TYPE_PRESETS[value].sensitivity);
  };

  const startCounting = useCallback(async () => {
    if (!imageUrl) {
      setError('Iltimos, avval rasm yuklang');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const res = await analyzeImage(imageUrl, sensitivity);
      setCount(res.count);
      setConfirmedCount(res.count);
      setBoxes(res.boxes);
      setImgSize({ w: res.width, h: res.height });
      if (res.count === 0) {
        setError("Fon va obyektlar orasidagi farq kam — sezuvchanlikni o'zgartirib qayta sinang");
      }
    } catch (err: any) {
      setError(err?.message || 'Tahlilda xatolik yuz berdi');
    }
    setIsProcessing(false);
  }, [imageUrl, sensitivity]);

  const addManual = () => setCount((p) => p + 1);
  const removeOne = () => setCount((p) => Math.max(0, p - 1));
  const reset = () => {
    setImageUrl(null);
    setCount(0);
    setConfirmedCount(0);
    setBoxes([]);
    setImgSize(null);
    setError(null);
  };

  // AI Kamera'dan yuborilgan rasm — avtomatik tahlil boshlanadi
  useEffect(() => {
    if (!pendingCountImage) return;
    setImageUrl(pendingCountImage);
    setBoxes([]);
    setCount(0);
    setConfirmedCount(0);
    setImgSize(null);
    setError(null);
    setPendingCountImage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCountImage]);

  // rasm yuklangach (kamera yoki fayl) — haqiqiy tahlil avtomatik boshlanadi
  useEffect(() => {
    if (!imageUrl) return;
    const id = setTimeout(() => startCounting(), 50);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F8FF]">{t(language, 'counter')}</h1>
            <p className="text-sm text-[#9EB7D3]">{t(language, 'localAnalysis')}</p>
          </div>
          <Button variant="outline" size="sm" onClick={reset} aria-label={t(language, 'delete')}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <Card className="p-0 overflow-hidden">
              <div className="relative aspect-video bg-[#0A1D33] border-b border-[#174D78] overflow-hidden">
                {imageUrl ? (
                  <>
                    <img src={imageUrl} alt="Yuklangan rasm" className="w-full h-full object-contain" />
                    {imgSize &&
                      boxes.map((b, i) => (
                        <div
                          key={i}
                          className="absolute border-2 border-[#22C99A] rounded-sm"
                          style={{
                            left: `${(b.x / imgSize.w) * 100}%`,
                            top: `${(b.y / imgSize.h) * 100}%`,
                            width: `${(b.w / imgSize.w) * 100}%`,
                            height: `${(b.h / imgSize.h) * 100}%`,
                          }}
                        >
                          <span className="absolute -top-4 left-0 text-[9px] font-bold px-1 rounded bg-[#22C99A] text-[#061426]">
                            {i + 1}
                          </span>
                        </div>
                      ))}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
                    <ImageIcon className="w-14 h-14 text-[#6B7C93] mb-4" />
                    <p className="text-[#9EB7D3] mb-4">{t(language, 'uploadImage')}</p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={uploadImage}
                      className="hidden"
                      id="counter-upload"
                    />
                    <div className="flex gap-3">
                      <label
                        htmlFor="counter-upload"
                        className="cursor-pointer bg-[#1677FF] hover:bg-[#29B6FF] text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                      >
                        {t(language, 'uploadImage')}
                      </label>
                      <label
                        htmlFor="counter-upload"
                        className="cursor-pointer border border-[#174D78] text-[#F5F8FF] text-sm font-medium px-5 py-2.5 rounded-lg hover:border-[#1677FF] transition-colors flex items-center gap-2"
                      >
                        <CameraIcon className="w-4 h-4" /> {t(language, 'takePhoto')}
                      </label>
                    </div>
                  </div>
                )}

                {isProcessing && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
                    <div className="w-8 h-8 border-4 border-[#1677FF]/30 border-t-[#1677FF] rounded-full animate-spin mb-4" />
                    <p className="text-[#29B6FF] text-sm">{t(language, 'analysisRunning')}</p>
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(TYPE_PRESETS).map(([value, preset]) => (
                    <button
                      key={value}
                      onClick={() => pickType(value)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        objectType === value
                          ? 'bg-[#1677FF]/20 text-[#1677FF] border border-[#1677FF]/50'
                          : 'bg-[#0A1D33] text-[#9EB7D3] border border-[#174D78] hover:bg-[#102943]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-3 mb-4 text-sm text-[#9EB7D3]">
                  Sezuvchanlik
                  <input
                    type="range"
                    min={20}
                    max={120}
                    value={sensitivity}
                    onChange={(e) => setSensitivity(Number(e.target.value))}
                    className="flex-1 accent-[#1677FF]"
                  />
                  <span className="w-8 text-right text-[#F5F8FF] tabular-nums">{sensitivity}</span>
                </label>

                <Button className="w-full" onClick={startCounting} disabled={!imageUrl || isProcessing}>
                  {isProcessing ? t(language, 'analysisRunning') : 'Sanashni boshlash'}
                </Button>

                <p className="flex items-start gap-2 mt-3 text-xs text-[#6B7C93]">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#29B6FF]" />
                  {t(language, 'localAnalysis')}: rasm fon rangi va obyektlar orasidagi farq asosida piksellar
                  guruhlanib sanaladi. AI model yoki server ulanmagan.
                </p>
              </div>
            </Card>

            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#F5F8FF]">{t(language, 'result')}</h3>
                <div className="text-2xl font-bold text-[#29B6FF]">{count}</div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm p-3 rounded-lg bg-[#102943] border border-[#174D78]">
                  <span className="text-[#9EB7D3]">{t(language, 'objectsFound')}</span>
                  <span className="text-[#F5F8FF] font-bold">{count}</span>
                </div>
                <div className="flex justify-between text-sm p-3 rounded-lg bg-[#102943] border border-[#22C99A]/20">
                  <span className="text-[#9EB7D3]">{t(language, 'confirmed')}</span>
                  <span className="text-[#22C99A] font-bold">{confirmedCount}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={addManual}>
                  <Plus className="w-4 h-4 mr-1" /> 1
                </Button>
                <Button variant="outline" onClick={removeOne}>
                  <Minus className="w-4 h-4 mr-1" /> 1
                </Button>
              </div>
              <Button
                className="w-full mt-2"
                onClick={() => setConfirmedCount(count)}
                disabled={confirmedCount === count}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> {t(language, 'saveResult')}
              </Button>
            </Card>

            <Card className="p-5">
              <h3 className="text-[#F5F8FF] font-semibold mb-3">Aniqlangan obyektlar</h3>
              {boxes.length === 0 ? (
                <p className="text-[#6B7C93] text-sm text-center py-4">Obyektlar aniqlanmagan</p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {boxes.map((b, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-xs p-2 rounded bg-[#0A1D33] border border-[#174D78]"
                    >
                      <span className="text-[#9EB7D3]">Obyekt {i + 1}</span>
                      <span className="text-[#29B6FF] tabular-nums">{b.w}×{b.h} px</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
