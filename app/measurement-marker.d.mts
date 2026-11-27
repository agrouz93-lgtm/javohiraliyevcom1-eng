import type {Point} from './shared';

export const markerMeters: number;
export const paperDimensions: {length: number; width: number};
export const markerPattern: readonly string[];
export function findMeasurementMarker(
  data: Uint8ClampedArray, width: number, height: number, onFloor: (point: Point) => boolean,
): Point[];
export function measurementMarkerPdf(): string;
export function findA4Paper(
  data: Uint8ClampedArray, width: number, height: number, onFloor: (point: Point) => boolean, placement: 'horizontal' | 'vertical',
): Point[];
