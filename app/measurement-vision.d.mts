import type {Point} from './shared';

export function suggestRoomOutline(data: Uint8ClampedArray, width: number, height: number): Point[];
export function suggestVisibleFloorBoundary(data: Uint8ClampedArray, width: number, height: number): Point[][];
export function visibleFloorPolygon(boundary: Point[][]): Point[];
export function findFloorReference(data: Uint8ClampedArray, width: number, height: number, outline: Point[]): Point[];
export function calibrateFloor(data: Uint8ClampedArray, width: number, height: number, outline: Point[], paperPlacement?: 'horizontal' | 'vertical'): {
  points: Point[]; length: number; width: number; source: 'marker' | 'paper';
} | null;
export function measuredDimensions(outline: Point[], useReferenceAxes?: boolean): {length: number; width: number};
