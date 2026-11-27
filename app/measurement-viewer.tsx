'use client';

import {useEffect, useRef, useState, type KeyboardEvent as ReactKeyEvent, type PointerEvent, type RefObject} from 'react';
import {createPortal} from 'react-dom';
import {Hand, ImageIcon, Maximize, Minimize, RefreshCw, RotateCw, ZoomIn, ZoomOut} from 'lucide-react';
import {fmt, type Point} from './shared';
import styles from './measurement.module.css';

type ViewerProps = {
  image: string;
  ratio: number;
  outline: Point[];
  visibleBoundary: Point[][];
  reference: Point[];
  target: 'outline' | 'reference';
  sides?: number[];
  area?: string;
  roomSize?: string;
  areaLabel?: string;
  scanning: boolean;
  busy: boolean;
  editing: boolean;
  live: boolean;
  perspective: boolean;
  video: RefObject<HTMLVideoElement | null>;
  onVideoReady: () => void;
  onRotate: () => void;
  onScan: () => void;
  onPointerDown: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerEnd: () => void;
  onAdjustPoint: (index: number, dx: number, dy: number) => void;
};

const svgPoints = (points: Point[]) => points.map(({x, y}) => (x * 100) + ',' + (y * 100)).join(' ');
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function MeasurementViewer(props: ViewerProps) {
  const {image, ratio, outline, visibleBoundary, reference, target, sides, area, roomSize, scanning, busy, live, perspective, video} = props;
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [pan, setPan] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const fullscreen = useRef<HTMLButtonElement>(null);
  const hasDrawing = Boolean(image || outline.length);
  const canEdit = props.editing && hasDrawing && !busy && !pan && !live;
  const partial = outline.length < 3 && visibleBoundary.length > 0;

  useEffect(() => {
    setZoom(1);
    setPan(false);
    if (!hasDrawing) setExpanded(false);
  }, [image, hasDrawing]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    fullscreen.current?.focus();
    function keys(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setExpanded(false);
      }
      if (event.key !== 'Tab') return;
      const controls = panel.current?.querySelectorAll<HTMLElement | SVGElement>('button:not(:disabled), [tabindex="0"]');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    window.addEventListener('keydown', keys);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', keys);
      requestAnimationFrame(() => fullscreen.current?.focus());
    };
  }, [expanded]);

  const setMagnification = (amount: number) => {
    const adjusted = clamp(amount, 1, 3);
    setZoom(adjusted);
    setPan(adjusted > 1);
  };
  const surface = {
    '--measurement-ratio': hasDrawing ? ratio : 1.82,
    '--measurement-zoom': zoom,
  } as React.CSSProperties;
  const fullLabel = expanded ? 'To‘liq ekrandan chiqish' : 'To‘liq ekran rejimi';
  const center = outline.reduce((total, point) => ({x: total.x + point.x, y: total.y + point.y}), {x: 0, y: 0});
  const areaTop = clamp(center.y / (outline.length || 1) * 100, 34, 69);
  const badgeClearance = roomSize ? 24 : 20;
  const referenceMatchesOutline = reference.length === outline.length &&
    reference.every((point, index) => point.x === outline[index].x && point.y === outline[index].y);

  function moveWithKeys(event: ReactKeyEvent<SVGElement>, index: number) {
    const directions: Record<string, [number, number]> = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]};
    const direction = directions[event.key];
    if (!direction || !canEdit) return;
    event.preventDefault();
    const step = event.shiftKey ? .015 : .003;
    props.onAdjustPoint(index, direction[0] * step, direction[1] * step);
  }

  const viewer = <div ref={panel} className={styles['measurement-viewer'] + (expanded ? ' ' + styles['is-expanded'] : '')}
    role={expanded ? 'dialog' : undefined} aria-modal={expanded || undefined} aria-label={expanded ? 'O‘lchov surati' : undefined}>
    <div className={styles['measurement-stage']} style={surface}>
      {live ? <video ref={video} autoPlay muted playsInline className={styles['measurement-video']} onCanPlay={props.onVideoReady}/> :
        <div className={styles['measurement-surface'] + (canEdit ? ' ' + styles['is-editing'] : '')}>
          {image ? <img src={image} alt="O‘lchanayotgan xona surati" draggable={false}/> :
            <div className={styles['measurement-empty']}>
              <ImageIcon size={30} aria-hidden="true"/>
              <strong>{hasDrawing ? 'Saqlangan kontur' : 'Xona suratini qo‘shing'}</strong>
              {!hasDrawing && <span>Pol chegaralari va o‘lchov tayanchi kadrda ko‘rinsin.</span>}
            </div>}
          {hasDrawing && <svg className={styles['measurement-overlay']}
            aria-label={partial ? 'Polning ko‘rinadigan chegarasi' : 'Pol konturi va tayanch nuqtalari'}
            viewBox="0 0 100 100" preserveAspectRatio="none"
            onPointerDown={canEdit ? props.onPointerDown : undefined}
            onPointerMove={canEdit ? props.onPointerMove : undefined}
            onPointerUp={props.onPointerEnd} onPointerCancel={props.onPointerEnd} onLostPointerCapture={props.onPointerEnd}>
            {outline.length > 2 ? <polygon className={styles['measurement-boundary']} points={svgPoints(outline)}/> :
              <polyline className={styles['measurement-boundary']} points={svgPoints(outline)}/>}
            {partial && visibleBoundary.map((segment, index) =>
              <polyline key={index} className={styles['measurement-boundary'] + ' ' + styles['measurement-partial-boundary']}
                points={svgPoints(segment)}/>)}
            {!referenceMatchesOutline && reference.length > 1 && <polyline className={styles['measurement-reference']}
              points={svgPoints(perspective && reference.length === 4 ? [...reference, reference[0]] : reference)}/>}
            {outline.map((point, index) => <rect key={index} className={styles['measurement-corner']}
              x={point.x * 100 - 1} y={point.y * 100 - ratio} width="2" height={ratio * 2} rx=".25"
              tabIndex={canEdit && target === 'outline' ? 0 : undefined} aria-label={`Polning ${index + 1}-burchagi`}
              onKeyDown={target === 'outline' ? event => moveWithKeys(event, index) : undefined}/>)}
            {target === 'reference' && reference.map((point, index) => <g key={index} tabIndex={canEdit ? 0 : undefined}
              aria-label={`Tayanchning ${index + 1}-nuqtasi`} onKeyDown={event => moveWithKeys(event, index)}>
              <circle className={styles['measurement-reference-point']} cx={point.x * 100} cy={point.y * 100} r="1.05"/>
              <text className={styles['measurement-reference-number']} x={clamp(point.x * 100 + 2, 3, 94)} y={clamp(point.y * 100 - 2, 6, 96)}>{index + 1}</text>
            </g>)}
          </svg>}
          {partial && <span className={styles['measurement-partial-label']}>Polning ko‘rinadigan chegarasi</span>}
          {sides && outline.map((point, index) => {
            const next = outline[(index + 1) % outline.length];
            if (Math.hypot((point.x - next.x) * ratio, point.y - next.y) < .09 * Math.min(1, ratio)) return null;
            const midX = (point.x + next.x) / 2, midY = (point.y + next.y) / 2;
            const outwardX = (midX - center.x / outline.length) * ratio;
            const outwardY = midY - center.y / outline.length;
            const offset = .075 * Math.min(1, ratio) / (Math.hypot(outwardX, outwardY) || 1);
            const x = clamp((midX + offset * outwardX / ratio) * 100, 10, 90);
            const sideY = clamp((midY + offset * outwardY) * 100, 8, 92);
            const y = area && Math.abs(x - 50) < 25 && Math.abs(sideY - areaTop) < badgeClearance ?
              clamp(areaTop + (sideY < areaTop ? -badgeClearance : badgeClearance), 8, 92) : sideY;
            return <span key={index} className={styles['measurement-side-value']}
              style={{left: x + '%', top: y + '%'}} aria-hidden="true">{fmt(sides[index])} m</span>;
          })}
          {area && <div className={styles['measurement-photo-area']} style={{top: areaTop + '%'}} aria-hidden={!expanded}>
            <span>{props.areaLabel ?? 'Pol maydoni'}</span><strong>{area}</strong>
            {roomSize && <small className={styles['measurement-photo-size']}>{roomSize}</small>}
          </div>}
          {scanning && <div className={styles['measurement-scan']} role="status"><span>Pol chegaralari tahlil qilinmoqda…</span></div>}
        </div>}
    </div>
    <div className={styles['measurement-view-actions']} aria-label="Suratni boshqarish">
      <button type="button" disabled={!image || busy || zoom >= 3} title="Rasmni kattalashtirish" aria-label="Rasmni kattalashtirish"
        onClick={() => setMagnification(zoom + .25)}><ZoomIn size={20}/></button>
      <button type="button" disabled={!image || busy || zoom <= 1} title="Rasmni kichraytirish" aria-label="Rasmni kichraytirish"
        onClick={() => setMagnification(zoom - .25)}><ZoomOut size={20}/></button>
      {zoom > 1 && <button type="button" title="Rasmni surish" aria-label="Rasmni surish" aria-pressed={pan}
        onClick={() => setPan(value => !value)}><Hand size={19}/></button>}
      <button type="button" disabled={!image || busy} title="Rasmni aylantirish" aria-label="Rasmni aylantirish" onClick={props.onRotate}><RotateCw size={19}/></button>
      <button type="button" disabled={!image || busy} title="Qayta skanerlash" aria-label="Qayta skanerlash" onClick={props.onScan}><RefreshCw size={19}/></button>
      <button type="button" ref={fullscreen} className={styles['measurement-fullscreen']} disabled={!hasDrawing || live} title={fullLabel} aria-label={fullLabel}
        onClick={() => setExpanded(value => !value)}>{expanded ? <Minimize size={20}/> : <Maximize size={20}/>}</button>
    </div>
  </div>;
  return expanded ? createPortal(<div className={styles['measurement-workbench'] + ' ' + styles['measurement-overlay-root']}>{viewer}</div>, document.body) : viewer;
}
