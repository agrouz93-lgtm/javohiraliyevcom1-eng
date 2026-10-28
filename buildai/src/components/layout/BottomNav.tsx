import React from 'react';
import { Home, Camera, Cpu, Calculator, LayoutGrid, ShoppingCart, Folder, Settings } from 'lucide-react';
import { useAppStore } from '@/store';
import { t } from '@/translations';

interface NavItem {
  icon: React.ComponentType<any>;
  label: string;
  page: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: 'home', page: 'home' },
  { icon: Camera, label: 'camera', page: 'camera' },
  { icon: Cpu, label: 'counter', page: 'counter' },
  { icon: Calculator, label: 'calculator', page: 'calculator' },
  { icon: LayoutGrid, label: 'planner', page: 'planner' },
  { icon: ShoppingCart, label: 'shop', page: 'shop' },
  { icon: Folder, label: 'projects', page: 'projects' },
  { icon: Settings, label: 'settings', page: 'settings' },
];

interface BottomNavProps {
  activePage: string;
  onPageChange: (page: string) => void;
}

export function BottomNav({ activePage, onPageChange }: BottomNavProps) {
  const { language } = useAppStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-[#061426] border-t border-[#174D78] z-50">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = activePage === item.page;
          return (
            <button
              key={item.page}
              onClick={() => onPageChange(item.page)}
              className={`flex flex-col items-center justify-center w-10 h-full gap-1 rounded-xl transition-colors p-2 ${
                isActive ? 'bg-[#102943] text-[#1677FF]' : 'text-[#6B7C93] hover:text-[#9EB7D3] hover:bg-[#0A1D33]'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? '' : 'opacity-70'}`} />
              <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                {t(language, item.label)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
