// USTAPRO - TypeScript types

export type Language = 'uz' | 'ru' | 'en';
export type Theme = 'dark' | 'light';
export type Unit = 'm' | 'cm' | 'mm';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  language: Language;
  theme: Theme;
  unit: Unit;
  premium: boolean;
  createdAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  area: number; // square meters
  roomCount: number;
  wallLength: number;
  createdAt: Date;
  updatedAt: Date;
  floorPlan?: FloorPlan;
  materials?: MaterialCalculation[];
  planner?: PlannerState;
}

export interface FloorPlan {
  id: string;
  projectId: string;
  walls: Wall[];
  rooms: Room[];
  doors: Door[];
  windows: Window[];
  dimensions: {
    width: number;
    height: number;
    unit: Unit;
  };
}

export interface Wall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number; // cm
  height: number; // cm
  roomId?: string;
}

export interface Room {
  id: string;
  name: string;
  area: number; // m²
  perimeter: number; // m
  wallIds: string[];
  color?: string;
  floorMaterial?: string;
  wallMaterial?: string;
}

export interface Door {
  id: string;
  x: number;
  y: number;
  width: number; // cm
  height: number; // cm
  wallId: string;
  type: 'single' | 'double' | 'sliding';
}

export interface Window {
  id: string;
  x: number;
  y: number;
  width: number; // cm
  height: number; // cm
  wallId: string;
}

export interface MaterialCalculation {
  id: string;
  projectId: string;
  type: 'brick' | 'cement' | 'sand' | 'concrete' | 'tile' | 'paint' | 'flooring' | 'roofing' | 'other';
  name: string;
  quantity: number;
  unit: Unit;
  pricePerUnit: number;
  totalPrice: number;
  wasteFactor: number; // percentage
}

export interface ShopItem {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  image: string;
  description: string;
  stock: number;
  demo?: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
}

export interface Measurement {
  id: string;
  type: 'room' | 'wall' | 'floor' | 'exterior' | 'manual';
  length: number;
  width: number;
  area: number;
  perimeter: number;
  unit: Unit;
  image?: string;
  createdAt: Date;
}

export interface CountResult {
  id: string;
  imageUrl: string;
  objectType: string;
  count: number;
  confirmedCount: number;
  detections: Detection[];
  createdAt: Date;
}

export interface Detection {
  id: string;
  label: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confirmed: boolean;
}

export interface AppNotification {
  id: string;
  titleKey: string; // translation key
  body?: string;
  read: boolean;
  createdAt: Date;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  unit: string;
  qty: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  createdAt: string;
}

export interface PlannerRoom {
  id: string;
  name: string;
  w: number; // meters
  d: number; // meters
  x: number; // center, meters
  z: number; // center, meters
  door: boolean;
  windows: number;
  floor?: number; // qavat (1..3)
}

export type ExteriorKind = 'archa' | 'olma' | 'terak' | 'qayragoch' | 'bush' | 'path' | 'fence' | 'light' | 'car' | 'prop';

export type CarBody = 'sedan' | 'suv' | 'van';

/** Do'kondan sotib olinadigan tayyor buyumlar turi */
export type PropKind = 'land' | 'wall' | 'roof' | 'lamp' | 'sofa' | 'table' | 'bed' | 'wardrobe' | 'chair' | 'crate';

export interface ExteriorItem {
  id: string;
  kind: ExteriorKind;
  x: number;
  z: number;
  // kind === 'car' uchun
  carId?: string;
  carName?: string;
  carBody?: CarBody;
  carColor?: string;
  // kind === 'prop' uchun (tayyor devor, tom, mebel, chiroq, yer...)
  propKind?: PropKind;
  propColor?: string;
  propName?: string;
  propProductId?: string;
}

export interface PlannerState {
  projectName: string;
  rooms: PlannerRoom[];
  items: ExteriorItem[];
  wallColor: string;
  roofColor: string;
  floorColor: string;
  roofOn: boolean;
  night: boolean;
  floors?: number; // qavatlar soni (1..3)
}

export interface CalculatorResult {
  type: 'simple' | 'scientific' | 'construction';
  expression: string;
  result: number;
  timestamp: Date;
}