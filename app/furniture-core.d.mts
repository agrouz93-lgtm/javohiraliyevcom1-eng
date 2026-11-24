import type { Plan, Element } from "./shared";
export type FurnitureProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  modelUrl: string;
  imageUrl: string;
  material: string;
  dimensions: { width: number; height: number; depth: number };
  colors: string[];
  price: number | null;
  available: boolean;
  version: number;
  createdAt: string;
  modelKind?: string;
};
export type FurnitureCategory = { id: string; name: string };
export const furnitureCatalog: {
  categories: FurnitureCategory[];
  products: FurnitureProduct[];
};
export function furnitureBounds(element: Element): {
  x: number;
  y: number;
  w: number;
  d: number;
};
export function furniturePlacementError(
  plan: Plan,
  element: Element,
): string | null;
export function placeFurniture(
  plan: Plan,
  product: Omit<
    FurnitureProduct,
    "imageUrl" | "description" | "createdAt" | "modelKind"
  >,
  roomId?: string,
  floor?: number,
): Plan;
export function furnitureEstimate(plan: Plan): {
  rows: {
    id: string;
    name: string;
    quantity: number;
    price: number | null;
    total: number | null;
  }[];
  total: number;
  complete: boolean;
};
export function applyFurnitureVoice(
  plan: Plan,
  text: string,
  selectedId: string,
  activeFloor?: number,
  products?: FurnitureProduct[],
): Plan;
export function validCatalogProduct(
  product: unknown,
): product is FurnitureProduct;

export function duplicateFurniture(plan: Plan, source: Element): Plan;
export function alignFurniture(
  plan: Plan,
  element: Element,
  direction: "left" | "right" | "back" | "front",
): Plan;
