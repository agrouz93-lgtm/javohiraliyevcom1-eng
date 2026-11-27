import type {Item, Plan, Point} from './shared';

export function rectangle(length: number, width: number): {area: number; perimeter: number};
export function polygon(points: Point[], metersPerPixel: number): {area: number; perimeter: number; sides: number[]} | null;
type PhotoMeasurement = (NonNullable<ReturnType<typeof polygon>> & {outline: Point[]}) | null;
export function measurePhotoArea(points: Point[], reference: Point[], meters: number, aspectRatio: number): PhotoMeasurement;
export function projectiveRectangle(reference: Point[]): {
  origin: Point; a: number; b: number; c: number; d: number; gx: number; gy: number;
} | null;
export function measurePerspectiveArea(points: Point[], reference: Point[], length: number, width: number): PhotoMeasurement;
export function countMaterials(items: Pick<Item, 'type' | 'pieces'>[]): Record<string, number>;
export const roomTypes: string[];
export const objectTypes: string[];
export const palettes: Record<string, [string, string, string]>;
export type EstimateKind = 'area' | 'volume' | 'perimeter' | 'wall' | 'roof' | 'brick' | 'cement' | 'concrete' | 'board' | 'slate' | 'paint' | 'tile';
export function estimate(kind: EstimateKind, l: number, w: number, h: number, coverage: number, waste: number, price: number, markup: number, labor: number): {
  base: number; unit: string; formula: string; quantity: number; materials: number; total: number;
};
export function validPlan(plan: unknown): plan is Plan;
export function suggestPlan(prompt: string): Plan;
