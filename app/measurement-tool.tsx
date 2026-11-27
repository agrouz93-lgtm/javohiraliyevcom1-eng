'use client';

import {useEffect, useRef, useState, type ChangeEvent, type PointerEvent} from 'react';
import {Camera, Download, House, ImagePlus, Layers3, MoveHorizontal, Ruler, ScanLine, Share2, Trash2, Waypoints, X} from 'lucide-react';
import {measurePerspectiveArea, measurePhotoArea, rectangle} from './domain.mjs';
import {calibrateFloor, measuredDimensions, suggestRoomOutline, suggestVisibleFloorBoundary, visibleFloorPolygon} from './measurement-vision.mjs';
import {measurementMarkerPdf} from './measurement-marker.mjs';
import {MeasurementViewer} from './measurement-viewer';
import {download, id, type Entry, type Point, type Save} from './shared';
import styles from './measurement.module.css';

type PaperPlacement = 'horizontal' | 'vertical';
type Picture = {blob: Blob; url: string; width: number; height: number; paperPlacement: PaperPlacement};
type Phase = 'idle' | 'camera' | 'scan' | 'rotate' | 'save';
type Bridge = {setCameraFileChooser?: (camera: boolean) => void};
type Target = 'outline' | 'reference';
const format = new Intl.NumberFormat('uz-UZ', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const withUnit = (value: number, unit: string) => format.format(value) + ' ' + unit;
const bridge = () => (window as Window & {UstaAndroid?: Bridge}).UstaAndroid;
const numberField = (value: unknown) => typeof value === 'number' || typeof value === 'string' ? String(value) : '';
const pointField = (value: unknown): Point[] => Array.isArray(value) ? value.filter(point =>
  point && Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.x <= 1 &&
  point.y >= 0 && point.y <= 1).slice(0, 100) : [];

function meters(value: string) {
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function longestSide(points: Point[], ratio: number) {
  let longest = 0, first = 0;
  for (let index = 0; index < points.length; index++) {
    const a = points[index], b = points[(index + 1) % points.length];
    const length = Math.hypot((a.x - b.x) * ratio, a.y - b.y);
    if (length > longest) { longest = length; first = index; }
  }
  return longest ? [points[first], points[(first + 1) % points.length]] : [];
}

function encodePhoto(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error('Suratni saqlash imkoni bo‘lmadi.'));
  }, 'image/jpeg', .94));
}

async function photoCanvas(blob: Blob, limit: number) {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Bo‘sh surat');
    const scale = Math.min(1, limit / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d', {willReadFrequently: limit <= 300});
    if (!context) throw new Error('Suratni tayyorlab bo‘lmadi.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return {canvas, context};
  } finally {
    URL.revokeObjectURL(url);
  }
}

function outlinePixels(source: HTMLCanvasElement) {
  const scale = Math.min(1, 360 / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Suratni tayyorlab bo‘lmadi.');
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function afterPaint() {
  return new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

function pointAt(event: PointerEvent<SVGSVGElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  return {x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))};
}

export function MeasurementTool({initial, signedIn, save}: {initial?: Entry; signedIn: boolean; save: Save}) {
  const payload = initial?.payload;
  const entryId = useRef(initial?.id);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const chooser = useRef<HTMLInputElement>(null);
  const captureInput = useRef<HTMLInputElement>(null);
  const capturePaper = useRef(false);
  const operation = useRef(0);
  const dragging = useRef<number | null>(null);
  const [method, setMethod] = useState<'photo' | 'dimensions'>(
    payload?.measureMethod === 'dimensions' ||
    (payload?.measureMethod === undefined && Number(payload?.length) > 0 && Number(payload?.width) > 0) ? 'dimensions' : 'photo');
  const [picture, setPicture] = useState<Picture>();
  const [savedRatio] = useState(meters(numberField(payload?.ratio)) || 1.5);
  const [outline, setOutline] = useState(() => pointField(payload?.points));
  const [visibleBoundary, setVisibleBoundary] = useState<Point[][]>([]);
  const [visibleArea, setVisibleArea] = useState<number>();
  const [paperReference, setPaperReference] = useState(false);
  const [reference, setReference] = useState(() => pointField(payload?.reference).slice(0, 2));
  const [referenceCorners, setReferenceCorners] = useState(() => pointField(payload?.referenceCorners).slice(0, 4));
  const [perspective, setPerspective] = useState(!payload || payload.perspective === true);
  const [referenceSource, setReferenceSource] = useState<'marker' | 'paper' | 'manual'>(
    payload?.referenceSource === 'marker' || payload?.referenceSource === 'paper' ? payload.referenceSource : 'manual');
  const [distance, setDistance] = useState(numberField(payload?.distance));
  const [referenceLength, setReferenceLength] = useState(numberField(payload?.referenceLength));
  const [referenceWidth, setReferenceWidth] = useState(numberField(payload?.referenceWidth));
  const [length, setLength] = useState(numberField(payload?.length));
  const [width, setWidth] = useState(numberField(payload?.width));
  const [photoLength, setPhotoLength] = useState('');
  const [photoWidth, setPhotoWidth] = useState('');
  const [height, setHeight] = useState(numberField(payload?.wallHeight));
  const [target, setTarget] = useState<Target>('outline');
  const [editing, setEditing] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [live, setLive] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [sharedReport, setSharedReport] = useState('');
  const busy = phase !== 'idle';
  const photo = method === 'photo';
  const ratio = picture ? picture.width / picture.height : savedRatio;
  const selectedReference = perspective ? referenceCorners : reference;
  const setSelectedReference = perspective ? setReferenceCorners : setReference;
  const targetPoints = target === 'outline' ? outline : selectedReference;
  function setTargetPoints(update: (previous: Point[]) => Point[]) {
    if (target === 'outline') setOutline(update);
    else {
      setReferenceSource('manual');
      setSelectedReference(update);
    }
  }
  const referenceCount = perspective ? 4 : 2;
  const scaleReady = selectedReference.length === referenceCount &&
    (perspective ? meters(referenceLength) > 0 && meters(referenceWidth) > 0 : meters(distance) > 0);
  const photoResult = photo ? (perspective ?
    measurePerspectiveArea(outline, referenceCorners, meters(referenceLength), meters(referenceWidth)) :
    measurePhotoArea(outline, reference, meters(distance), ratio)) : null;
  const panelEntry = Boolean(photo && picture && (!photoResult || photoLength || photoWidth));
  const manualLength = meters(photo ? photoLength : length), manualWidth = meters(photo ? photoWidth : width);
  const wallHeight = meters(height);
  const manual = (!photo || panelEntry) && manualLength > 0 && manualWidth > 0 ? rectangle(manualLength, manualWidth) : null;
  const enteredResult = manual && Number.isFinite(manual.area) && Number.isFinite(manual.perimeter) ?
    {...manual, length: manualLength, width: manualWidth} : null;
  const result = enteredResult ?? (photoResult ?
    {...photoResult, ...measuredDimensions(photoResult.outline, perspective && referenceSource === 'manual')} : null);
  const estimated = !enteredResult && Boolean(photoResult);
  const prefix = estimated ? '≈ ' : '';
  const area = result ? prefix + withUnit(result.area, 'm²') : undefined;
  const roomSize = result ? `${prefix}${withUnit(result.length, 'm')} × ${withUnit(result.width, 'm')}` : undefined;
  const partial = outline.length < 3 && visibleBoundary.length > 0;
  const partialArea = photo && !area && partial && visibleArea ? '≈ ' + withUnit(visibleArea, 'm²') : undefined;
  const displayedArea = area ?? partialArea;
  const reason = phase === 'scan' ? 'Surat tahlil qilinmoqda…' :
    !picture && !outline.length ? 'Rasmga oling yoki galereyadan surat tanlang.' :
    partialArea ? 'Xonaning umumiy maydoni uchun butun pol kadrga sig‘ishi kerak.' :
    partial ? 'Rasmda polning bir qismi ko‘rinadi. A4 qog‘oz bilan kadrdagi polni o‘lchash mumkin.' :
    outline.length < 3 ? 'Polning barcha burchaklari kadrda ko‘rinadigan qilib suratga oling.' :
    !scaleReady ? 'Avtomatik hisob uchun polga oq A4 qog‘oz yoki 18 sm o‘lchov belgisini qo‘ying.' :
    'Tayanch va pol konturini tekshiring yoki qayta suratga oling.';
  const accuracy = result ? (estimated ? (referenceSource === 'paper' ? 'A4 qog‘oz · taxminiy' :
    referenceSource === 'marker' && perspective ? '18 sm belgi · taxminiy' :
    perspective ? 'Perspektiva tuzatildi · taxminiy' : 'Bir tekislikda · taxminiy') :
    'Kiritilgan o‘lchamlar') : phase === 'scan' ? 'Tahlil qilinmoqda' :
      partialArea ? 'Kadr bo‘yicha · taxminiy' : partial ? 'Pol qisman ko‘rindi' :
        outline.length >= 3 ? (scaleReady ? 'Tayanchni tekshiring' : 'Masshtab kerak') :
          picture ? 'Kontur aniqlanmadi' : 'Surat kutilmoqda';

  useEffect(() => () => {
    operation.current++;
    stream.current?.getTracks().forEach(track => track.stop());
  }, []);
  useEffect(() => {
    if (live && video.current) video.current.srcObject = stream.current;
  }, [live]);
  useEffect(() => () => { if (picture) URL.revokeObjectURL(picture.url); }, [picture]);

  function stopCamera() {
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    setLive(false);
    setReady(false);
  }

  async function openCamera(usePaper: boolean) {
    capturePaper.current = usePaper;
    setMessage('');
    const native = bridge();
    if (native?.setCameraFileChooser && captureInput.current) {
      native.setCameraFileChooser(true);
      captureInput.current.click();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage('Brauzerda kamera uchun HTTPS manzilidan foydalaning.');
      return;
    }
    const current = ++operation.current;
    setPhase('camera');
    try {
      const camera = await navigator.mediaDevices.getUserMedia({
        video: {facingMode: {ideal: 'environment'}, width: {ideal: 1920}, height: {ideal: 1080}}, audio: false,
      });
      if (operation.current !== current) { camera.getTracks().forEach(track => track.stop()); return; }
      stream.current = camera;
      setLive(true);
      for (const track of camera.getVideoTracks()) track.addEventListener('ended', () => {
        if (stream.current !== camera) return;
        stopCamera();
        setMessage('Kamera uzildi. Qayta ochib ko‘ring.');
      }, {once: true});
    } catch (error) {
      if (operation.current === current) {
        const name = (error as Error).name;
        setMessage(name === 'NotAllowedError' ? 'Kamera ruxsatini brauzer yoki telefon sozlamalaridan yoqing.' :
          name === 'NotFoundError' ? 'Qurilmada kamera topilmadi. Galereyadan rasm tanlashingiz mumkin.' :
            'Kamera ochilmadi. Kamera bandligini tekshirib, qayta urinib ko‘ring.');
      }
    } finally {
      if (operation.current === current) setPhase('idle');
    }
  }

  function openGallery() {
    bridge()?.setCameraFileChooser?.(false);
    chooser.current?.click();
  }

  function clearPhoto() {
    operation.current++;
    dragging.current = null;
    stopCamera();
    setPhase('idle');
    setPicture(undefined);
    setOutline([]);
    setVisibleBoundary([]);
    setVisibleArea(undefined);
    setPaperReference(false);
    setReference([]);
    setReferenceCorners([]);
    setDistance('');
    setReferenceLength('');
    setReferenceWidth('');
    setReferenceSource('manual');
    setHeight('');
    setLength('');
    setWidth('');
    setPhotoLength('');
    setPhotoWidth('');
    setTarget('outline');
    setEditing(false);
    setMessage('');
    setSharedReport('');
    entryId.current = undefined;
  }

  async function detect(blob: Blob, current: number, replacing: boolean, paper?: PaperPlacement) {
    await afterPaint();
    const {canvas, context} = await photoCanvas(blob, 1800);
    if (operation.current !== current) return;
    const frame = outlinePixels(canvas);
    const proposed = suggestRoomOutline(frame.data, frame.width, frame.height);
    setVisibleArea(undefined);
    if (proposed.length < 3) {
      const boundary = suggestVisibleFloorBoundary(frame.data, frame.width, frame.height);
      setVisibleBoundary(boundary);
      const visible = visibleFloorPolygon(boundary);
      if (visible.length) {
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        const calibration = calibrateFloor(pixels.data, pixels.width, pixels.height, visible, paper);
        if (calibration) {
          const measured = measurePerspectiveArea(visible, calibration.points, calibration.length, calibration.width);
          if (measured) {
            setVisibleArea(measured.area);
            setMessage('Ko‘rinadigan pol chegarasi va kadrdagi maydon avtomatik hisoblandi.');
            return;
          }
        }
      }
      if (!boundary.length) setMessage('Pol chegarasi noaniq. Pol va devor tutashgan joylar ko‘rinadigan qilib qayta suratga oling.');
      else if (paper) setMessage('Pol qisman ko‘rindi. Bitta oq A4 qog‘ozni tekis qo‘yib, burchaklari bilan kadrga kiriting.');
      else setMessage('Ko‘rinadigan pol chegarasi belgilandi. m² uchun kadrda o‘lchov tayanchi bo‘lsin.');
      return;
    }
    setVisibleBoundary([]);
    const full = context.getImageData(0, 0, canvas.width, canvas.height);
    const calibration = calibrateFloor(full.data, full.width, full.height, proposed, paper);
    setOutline(proposed);
    setTarget('outline');
    if (calibration) {
      setPerspective(true);
      setReferenceCorners(calibration.points);
      setReferenceLength(String(calibration.length));
      setReferenceWidth(String(calibration.width));
      setReferenceSource(calibration.source);
      setEditing(false);
      setMessage(calibration.source === 'paper' ? 'A4 topildi. Xona o‘lchami va maydoni avtomatik hisoblandi.' :
        'Pol va 18 sm belgi topildi. Maydon hisoblandi.');
      return;
    }
    setMessage(paper && (replacing || !scaleReady) ? 'A4 aniq topilmadi. Kadrda bitta oq A4 va uning to‘rtta burchagi ko‘rinsin.' :
      replacing || !scaleReady ?
      proposed.length === 4 ? 'Pol konturi topildi. 18 sm belgi bilan qayta suratga oling yoki to‘rtburchak xonaning ma’lum tomonlarini kiriting.' :
        'Pol konturi topildi. Maydonni hisoblash uchun 18 sm belgini polga qo‘yib qayta suratga oling.' :
      'Pol konturi qayta aniqlandi. Oldingi tayanch o‘lcham ishlatildi.');
  }

  async function load(file: Blob, usePaper: boolean) {
    if (!file.size || file.size > 25_000_000 || (file.type && !file.type.startsWith('image/'))) {
      setMessage('25 MB gacha bo‘lgan suratni tanlang.');
      return;
    }
    const current = ++operation.current;
    setPhase('scan');
    setMessage('');
    try {
      const {canvas} = await photoCanvas(file, 1800);
      const blob = await encodePhoto(canvas);
      if (operation.current !== current) return;
      stopCamera();
      setPicture({blob, width: canvas.width, height: canvas.height, url: URL.createObjectURL(blob), paperPlacement: 'horizontal'});
      setOutline([]);
      setVisibleBoundary([]);
      setVisibleArea(undefined);
      setPaperReference(usePaper);
      setReference([]);
      setReferenceCorners([]);
      setDistance('');
      setReferenceLength('');
      setReferenceWidth('');
      setReferenceSource('manual');
      setPerspective(true);
      setPhotoLength('');
      setPhotoWidth('');
      setHeight('');
      setSharedReport('');
      setTarget('outline');
      setEditing(false);
      entryId.current = undefined;
      await detect(blob, current, true, usePaper ? 'horizontal' : undefined);
    } catch {
      if (operation.current === current) setMessage('Suratni ochib bo‘lmadi. JPEG, PNG yoki WebP surat bilan qayta urinib ko‘ring.');
    } finally {
      if (operation.current === current) setPhase('idle');
    }
  }

  function fileChanged(event: ChangeEvent<HTMLInputElement>, usePaper: boolean) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) void load(file, usePaper);
  }

  async function takePhoto() {
    const source = video.current;
    if (!source?.videoWidth || busy) return;
    const scale = Math.min(1, 1800 / Math.max(source.videoWidth, source.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(source.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(source.videoHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) { setMessage('Kamera kadrini olish imkoni bo‘lmadi.'); return; }
    const current = ++operation.current;
    const usePaper = capturePaper.current;
    setPhase('camera');
    try {
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      const blob = await encodePhoto(canvas);
      if (operation.current === current) await load(blob, usePaper);
    } catch {
      if (operation.current === current) {
        setPhase('idle');
        setMessage('Kamera kadrini olish imkoni bo‘lmadi.');
      }
    }
  }

  async function rescan(usePaper = paperReference, resetScale = false) {
    if (!picture || busy) return;
    const current = ++operation.current;
    setPhase('scan');
    setMessage('');
    try { await detect(picture.blob, current, resetScale, usePaper ? picture.paperPlacement : undefined); }
    catch { if (operation.current === current) setMessage('Suratni qayta tahlil qilib bo‘lmadi.'); }
    finally { if (operation.current === current) setPhase('idle'); }
  }

  function changePaperReference(checked: boolean) {
    setPaperReference(checked);
    setVisibleArea(undefined);
    const resetScale = !checked && referenceSource === 'paper';
    if (resetScale) {
      setReferenceCorners([]);
      setReferenceLength('');
      setReferenceWidth('');
      setReferenceSource('manual');
    }
    if (picture) void rescan(checked, resetScale);
  }

  async function rotate() {
    if (!picture || busy) return;
    const current = ++operation.current;
    setPhase('rotate');
    try {
      const {canvas: original} = await photoCanvas(picture.blob, 1800);
      const canvas = document.createElement('canvas');
      canvas.width = original.height;
      canvas.height = original.width;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas');
      context.translate(canvas.width, 0);
      context.rotate(Math.PI / 2);
      context.drawImage(original, 0, 0);
      const blob = await encodePhoto(canvas);
      if (operation.current !== current) return;
      const turn = ({x, y}: Point) => ({x: 1 - y, y: x});
      setPicture({blob, width: canvas.width, height: canvas.height, url: URL.createObjectURL(blob),
        paperPlacement: picture.paperPlacement === 'horizontal' ? 'vertical' : 'horizontal'});
      setOutline(previous => previous.map(turn));
      setVisibleBoundary(previous => previous.map(segment => segment.map(turn)));
      setReference(previous => previous.map(turn));
      setReferenceCorners(previous => previous.map(turn));
    } catch {
      if (operation.current === current) setMessage('Suratni aylantirib bo‘lmadi.');
    } finally {
      if (operation.current === current) setPhase('idle');
    }
  }

  function startPoint(event: PointerEvent<SVGSVGElement>) {
    if (busy || !editing || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const point = pointAt(event);
    const bounds = event.currentTarget.getBoundingClientRect();
    let hit = -1, nearest = event.pointerType === 'touch' ? 23 : 13;
    targetPoints.forEach((other, index) => {
      const distance = Math.hypot((other.x - point.x) * bounds.width, (other.y - point.y) * bounds.height);
      if (distance < nearest) { nearest = distance; hit = index; }
    });
    if (hit === -1 && targetPoints.length >= (target === 'reference' ? referenceCount : 100)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = hit === -1 ? targetPoints.length : hit;
    if (hit === -1) setTargetPoints(previous => [...previous, point]);
  }

  function movePoint(event: PointerEvent<SVGSVGElement>) {
    const index = dragging.current;
    if (index === null || busy) return;
    const point = pointAt(event);
    setTargetPoints(previous => previous.map((other, i) => i === index ? point : other));
  }

  function adjustPoint(index: number, dx: number, dy: number) {
    setTargetPoints(previous => previous.map((point, i) => i === index ? {
      x: Math.min(1, Math.max(0, point.x + dx)),
      y: Math.min(1, Math.max(0, point.y + dy)),
    } : point));
  }

  function useRoomSides() {
    setPerspective(true);
    setReferenceCorners(outline.slice());
    setReferenceSource('manual');
    setReferenceLength('');
    setReferenceWidth('');
    setTarget('reference');
    setEditing(true);
  }

  function showDimensions() {
    stopCamera();
    setMethod('dimensions');
    setMessage('');
  }

  const report = result ? [
    ['Maydon', withUnit(result.area, 'm²')],
    ['Xona o‘lchami', roomSize ?? ''],
    ['Uzunlik', withUnit(result.length, 'm')],
    ['Kenglik', withUnit(result.width, 'm')],
    ['Perimetr', withUnit(result.perimeter, 'm')],
    ...(wallHeight ? [['Devor balandligi', withUnit(wallHeight, 'm')]] : []),
    ['Aniqlik', estimated ? 'Taxminiy, tayanch o‘lcham va konturga bog‘liq' : 'Kiritilgan o‘lchamlarga asoslangan'],
  ] : [];

  async function saveResult() {
    if (!result || busy) return;
    const current = ++operation.current;
    const draft = {
      points: outline, reference, referenceCorners, perspective, distance: meters(distance),
      referenceLength: meters(referenceLength), referenceWidth: meters(referenceWidth), referenceSource, ratio,
      length: estimated ? 0 : manualLength, width: estimated ? 0 : manualWidth, wallHeight,
      measureMethod: estimated ? 'photo' : 'dimensions',
    };
    setPhase('save');
    setMessage('');
    try {
      if (signedIn) {
        entryId.current ??= id();
        await save('measurement', 'Uy maydoni', report, draft, entryId.current);
        if (operation.current === current) setMessage('O‘lchov loyihaga saqlandi.');
      } else {
        download('usta-olchov.json', new Blob([JSON.stringify({title: 'Uy maydoni', kind: 'measurement', rows: report, payload: draft}, null, 2)],
          {type: 'application/json'}));
        setMessage('O‘lchov fayli saqlash uchun tayyorlandi.');
      }
    } catch (error) {
      if (operation.current === current) setMessage((error as Error).message);
    } finally {
      if (operation.current === current) setPhase('idle');
    }
  }

  const reportText = result ? ['USTA PRO · Uy maydoni', ...report.map(([label, value]) => label + ' — ' + value)].join('\n') : '';

  async function shareResult() {
    if (!result) return;
    const current = operation.current;
    try {
      if (navigator.share) {
        await navigator.share({title: 'Uy maydoni', text: reportText});
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(reportText);
        if (operation.current === current) setMessage('O‘lchov matni nusxalandi.');
        return;
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
    }
    if (operation.current === current) setSharedReport(reportText);
  }

  return <div className={styles['measurement-workbench']}>
    <div className={styles['measurement-hero']}>
      <div className={styles['measurement-blueprint']} aria-hidden="true"><i/><i/><i/></div>
      <div className={styles['measurement-hero-symbol']}><House size={28} aria-hidden="true"/></div>
      <div><h1>Uy maydonini o‘lchash</h1><p>Suratdan yoki kiritilgan o‘lchamlardan xona maydoni va perimetrini hisoblang.</p></div>
    </div>
    <div className={styles['measurement-tabs']} aria-label="O‘lchash usuli">
      <button type="button" aria-pressed={photo} disabled={busy} onClick={() => {setMethod('photo'); setMessage('');}}><Camera size={18}/> Surat bo‘yicha</button>
      <button type="button" aria-pressed={!photo} disabled={busy} onClick={showDimensions}><Ruler size={18}/> Uzunlik × kenglik</button>
    </div>
    <div className={styles['measurement-layout']}>
      <section className={styles['measurement-card']} aria-label="O‘lchov manbasi">
        {photo ? <>
          <h2><ImagePlus size={22} aria-hidden="true"/> Xona surati yoki qavat rejasi</h2>
          {(!live || capturePaper.current) && <p className={styles['measurement-capture-guide']}>
            Avtomatik o‘lchash uchun polga bitta oq A4 qo‘ying. Uzun tomoni kadrda chapdan o‘ngga qarasin, pol va qog‘oz burchaklari ko‘rinsin.
          </p>}
          <div className={styles['measurement-capture-actions']}>
            {live ? <>
              <button type="button" className={styles['measurement-primary']} disabled={busy || !ready} onClick={takePhoto}><Camera size={18}/> Suratga tushirish</button>
              <button type="button" disabled={busy} onClick={stopCamera}><X size={18}/> Kamerani yopish</button>
            </> : <>
              <button type="button" className={styles['measurement-primary']} disabled={busy} onClick={() => void openCamera(true)}><Camera size={18}/> A4 bilan rasmga olish</button>
              <button type="button" disabled={busy} onClick={() => void openCamera(false)}>Rasmga olish</button>
              <button type="button" disabled={busy} onClick={openGallery}><ImagePlus size={18}/> Rasm yuklash</button>
            </>}
            <button type="button" className={styles['measurement-delete']} disabled={(!picture && !outline.length && phase !== 'scan') || phase === 'save'}
              onClick={clearPhoto}><Trash2 size={18}/> Rasmni o‘chirish</button>
            <input hidden ref={captureInput} type="file" accept="image/*" capture="environment"
              onChange={event => fileChanged(event, capturePaper.current)}/>
            <input hidden ref={chooser} type="file" accept="image/*" onChange={event => fileChanged(event, false)}/>
          </div>
            {message && <p className={styles['measurement-status']} role="status">{message}</p>}
            <MeasurementViewer image={picture?.url ?? ''} ratio={ratio} outline={outline} reference={selectedReference} target={target}
              visibleBoundary={visibleBoundary}
              sides={estimated ? photoResult?.sides : undefined} area={picture ? displayedArea : undefined}
              roomSize={picture ? roomSize : undefined}
              areaLabel={partialArea ? 'Kadrdagi pol maydoni' : enteredResult ? 'Kiritilgan xona maydoni' : undefined}
              scanning={phase === 'scan'} busy={busy} editing={editing} perspective={perspective}
              live={live} video={video} onVideoReady={() => setReady(true)} onRotate={rotate} onScan={() => void rescan()} onPointerDown={startPoint} onPointerMove={movePoint}
              onPointerEnd={() => {dragging.current = null;}} onAdjustPoint={adjustPoint}/>
          {picture && !live && (!displayedArea || paperReference) && <div className={styles['measurement-paper-reference']}>
            <label>
              <input type="checkbox" checked={paperReference} disabled={busy}
                onChange={event => changePaperReference(event.target.checked)}/>
              Suratda oq A4 bor
            </label>
          </div>}
          {!busy && !live && !displayedArea && !paperReference && <div className={styles['measurement-auto-guide']}>
            <p className={styles['measurement-help']}>Belgini 100% masshtabda chop eting. Qora kvadrat tomoni 18 sm bo‘lsin. Belgini polga tekis qo‘ying va butun pol bilan birga suratga oling.</p>
            <button type="button" onClick={() => download('usta-olchov-belgisi-18-sm.pdf',
              new Blob([measurementMarkerPdf()], {type: 'application/pdf'}))}><Download size={17}/> 18 sm belgini yuklash</button>
          </div>}
          {!live && (picture || outline.length > 0) && <div className={styles['measurement-edit-actions'] + ' ' + styles['measurement-options']}>
            {!area && !editing && outline.length === 4 &&
              <button type="button" disabled={busy} onClick={useRoomSides}>Ma’lum tomonlarni kiritish</button>}
            <button type="button" disabled={busy} aria-expanded={editing} onClick={() => {
              if (editing) setTarget('outline');
              setEditing(!editing);
            }}>Kontur va tayanchni sozlash</button>
          </div>}
          {!live && editing && (picture || outline.length > 0) && <div className={styles['measurement-calibration-panel']}>
            <div className={styles['measurement-calibration-header']}><h3>Masshtab va kontur</h3>
              <div className={styles['measurement-mini-switch']} aria-label="Surat burchagi">
                <button type="button" disabled={busy} aria-pressed={!perspective} onClick={() => setPerspective(false)}>Yuqoridan</button>
                <button type="button" disabled={busy} aria-pressed={perspective} onClick={() => setPerspective(true)}>Qiya surat</button>
              </div>
            </div>
            <div className={styles['measurement-edit-actions']}>
              <button type="button" disabled={busy} aria-pressed={target === 'outline'} onClick={() => setTarget('outline')}>Pol burchaklari</button>
              <button type="button" disabled={busy} aria-pressed={target === 'reference'} onClick={() => setTarget('reference')}>Tayanch nuqtalari</button>
              <button type="button" disabled={busy || !targetPoints.length} onClick={() => setTargetPoints(previous => previous.slice(0, -1))}>Oxirgi nuqtani o‘chirish</button>
              <button type="button" disabled={busy || !targetPoints.length} onClick={() => setTargetPoints(() => [])}>Nuqtalarni tozalash</button>
            </div>
            <p className={styles['measurement-help']}>{target === 'outline' ?
              'Binafsha nuqtalarni pol burchaklariga sudrang. Yangi nuqta uchun suratga bosing.' :
              selectedReference.length === referenceCount ?
                (perspective ? 'Suratdagi 1–2 va 2–3 tomonlarning haqiqiy uzunligini kiriting.' : 'Sariq chiziqning haqiqiy uzunligini kiriting.') :
                (perspective ? 'Pol bilan bir tekislikdagi, o‘lchami ma’lum to‘g‘ri to‘rtburchakning to‘rt burchagini tartib bilan bosing.' :
                  'Pol bilan bir tekislikdagi ma’lum masofaning ikki uchini belgilang.')}</p>
            <button type="button" disabled={busy || (perspective ? outline.length !== 4 : outline.length < 2)} onClick={() => {
              if (perspective) useRoomSides();
              else {
                setReference(longestSide(outline, ratio));
                setDistance('');
                setReferenceSource('manual');
                setTarget('reference');
              }
            }}>{perspective ? 'To‘g‘ri to‘rtburchak xona konturini ishlatish' : 'Konturning eng uzun tomonini ishlatish'}</button>
            <div className={styles['measurement-fields']}>
              {perspective ? <>
                <label>1–2 tomon (m)<input inputMode="decimal" value={referenceLength} onChange={event => {
                  setReferenceSource('manual'); setReferenceLength(event.target.value);
                }}/></label>
                <label>2–3 tomon (m)<input inputMode="decimal" value={referenceWidth} onChange={event => {
                  setReferenceSource('manual'); setReferenceWidth(event.target.value);
                }}/></label>
              </> : <label>Sariq 1–2 chiziq uzunligi (m)<input inputMode="decimal" value={distance} onChange={event => setDistance(event.target.value)}/></label>}
              <label>Devor balandligi (m, ixtiyoriy)<input inputMode="decimal" value={height} onChange={event => setHeight(event.target.value)}/></label>
            </div>
          </div>}
        </> : <>
          <h2><Ruler size={22} aria-hidden="true"/> Xona o‘lchamlari</h2>
          <p className={styles['measurement-help']}>To‘rtburchak xonaning o‘lchangan tomonlarini kiriting.</p>
          <div className={styles['measurement-fields']}>
            <label>Xona uzunligi (m)<input inputMode="decimal" value={length} onChange={event => setLength(event.target.value)}/></label>
            <label>Xona kengligi (m)<input inputMode="decimal" value={width} onChange={event => setWidth(event.target.value)}/></label>
            <label>Devor balandligi (m, ixtiyoriy)<input inputMode="decimal" value={height} onChange={event => setHeight(event.target.value)}/></label>
          </div>
        </>}
        {!photo && message && <p className={styles['measurement-status']} role="status">{message}</p>}
      </section>
      <aside className={styles['measurement-card'] + ' ' + styles['measurement-results']} aria-label="O‘lchov natijasi">
        <h2><ScanLine size={22} aria-hidden="true"/> O‘lchov natijasi</h2>
        <div className={styles['measurement-area']} aria-live="polite">
          <Layers3 size={31} aria-hidden="true"/>
          <span>{partialArea ? 'Kadrdagi pol maydoni' : 'Umumiy maydon'}</span>
          <strong key={displayedArea ?? 'empty'}>{displayedArea ?? '— m²'}</strong>
          {roomSize && <small className={styles['measurement-room-size']}>{roomSize}</small>}
          {!area && <small>{photo ? reason : 'Uzunlik va kenglikni kiriting.'}</small>}
        </div>
        {panelEntry && !live && <details className={styles['measurement-panel-entry']}>
          <summary>O‘lchamlarni qo‘lda kiritish</summary>
          <fieldset className={styles['measurement-panel-fields']} disabled={busy}>
            <legend>To‘g‘ri to‘rtburchak xona o‘lchamlari</legend>
            <div className={styles['measurement-fields']}>
              <label>Uzunlik (m)<input inputMode="decimal" value={photoLength} onChange={event => setPhotoLength(event.target.value)}/></label>
              <label>Kenglik (m)<input inputMode="decimal" value={photoWidth} onChange={event => setPhotoWidth(event.target.value)}/></label>
            </div>
          </fieldset>
        </details>}
        <dl className={styles['measurement-metrics']}>
          <div><dt><Ruler size={17} aria-hidden="true"/> Uzunlik</dt><dd>{result || manualLength ? withUnit(result?.length ?? manualLength, 'm') : '—'}</dd></div>
          <div><dt><MoveHorizontal size={17} aria-hidden="true"/> Kenglik</dt><dd>{result || manualWidth ? withUnit(result?.width ?? manualWidth, 'm') : '—'}</dd></div>
          <div><dt><Waypoints size={17} aria-hidden="true"/> Perimetr</dt><dd>{result ? withUnit(result.perimeter, 'm') : '—'}</dd></div>
          <div><dt>Devor balandligi</dt><dd>{wallHeight ? withUnit(wallHeight, 'm') : '—'}</dd></div>
          <div><dt>Aniqlik</dt><dd>{photo ? accuracy : result ? accuracy : '—'}</dd></div>
        </dl>
        {estimated && <p className={styles['measurement-help']}>Uzunlik va kenglik kontur bo‘yicha tashqi o‘lchamlardir. Aniqlik burchaklar va tayanch o‘lchamga bog‘liq.</p>}
        {estimated && photoResult && <details className={styles['measurement-sides']}>
          <summary>Kontur tomonlari</summary>
          <ul>{photoResult.sides.map((side, index) => <li key={index}>{index + 1}-tomon <strong>{withUnit(side, 'm')}</strong></li>)}</ul>
        </details>}
        <div className={styles['measurement-result-actions']}>
          <button type="button" className={styles['measurement-primary']} disabled={!result || busy} onClick={saveResult}><Download size={18}/> Natijani saqlash</button>
          <button type="button" disabled={!result || busy} onClick={shareResult}><Share2 size={17}/> Ulashish</button>
        </div>
        {sharedReport && sharedReport === reportText && <label className={styles['measurement-share-text']}>Ulashish uchun natijani nusxalang
          <textarea readOnly value={sharedReport} onFocus={event => event.currentTarget.select()}/>
        </label>}
      </aside>
    </div>
  </div>;
}
