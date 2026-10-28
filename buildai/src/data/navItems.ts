import type { LucideIcon } from 'lucide-react';
import {
  Home, Camera, Cpu, Calculator, LayoutGrid, Package,
  ShoppingCart, Folder, Settings, Plus,
} from 'lucide-react';

export interface NavItemDef {
  icon: LucideIcon;
  label: string; // translation key
  page: string;
  accent?: boolean;
}

export const NAV_ITEMS: NavItemDef[] = [
  { icon: Home, label: 'home', page: 'home' },
  { icon: Camera, label: 'camera', page: 'camera' },
  { icon: Cpu, label: 'counter', page: 'counter' },
  { icon: Calculator, label: 'calculator', page: 'calculator' },
  { icon: LayoutGrid, label: 'planner', page: 'planner' },
  { icon: Package, label: 'materials', page: 'materials' },
  { icon: ShoppingCart, label: 'shop', page: 'shop' },
  { icon: Folder, label: 'projects', page: 'projects' },
  { icon: Settings, label: 'settings', page: 'settings' },
  { icon: Plus, label: 'newProject', page: 'newProject', accent: true },
];
