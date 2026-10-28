const fs = require('fs');
const path = require('path');
const root = 'c:/Users/user/Desktop/3/buildai/src';

function write(rel, content) {
  fs.writeFileSync(path.join(root, rel), content, 'utf8');
  console.log('wrote', rel);
}

// ---------- NavContext.tsx ----------
write('context/NavContext.tsx', `import { createContext, useContext, useState, ReactNode } from 'react';

interface NavCtx {
  activePage: string;
  setActivePage: (page: string) => void;
}

const NavContext = createContext<NavCtx | null>(null);

export function NavProvider({ children, activePage }: { children: ReactNode; activePage: string }) {
  const [page, setPage] = useState(activePage);
  return (
    <NavContext.Provider value={{ activePage: page, setActivePage: setPage }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within NavProvider');
  return ctx;
}
`);

// ---------- Splash.tsx ----------
write('pages/Splash.tsx', `import { useState, useEffect } from 'react';

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let t: number;
    let start = Date.now();
    const run = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, Math.floor((elapsed / 3000) * 100));
      setProgress(p);
      if (p < 100) {
        t = window.requestAnimationFrame(run);
      } else {
        t = window.setTimeout(() => onFinish(), 400);
      }
    };
    run();
    return () => {
      window.cancelAnimationFrame(t);
      window.clearTimeout(t as any);
    };
  }, [onFinish]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#061426] text-[#F5F8FF] overflow-hidden">
      {/* Cosmic neon background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-[#1677FF]/20 rounded-full blur-[120px] -mt-32 animate-pulse" />
        <div className="absolute bottom-0 right-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#8B5CF6]/20 rounded-full blur-[100px] -mb-24" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#22C99A]/15 rounded-full blur-[80px]" />
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1677FF]/10 via-transparent to-transparent opacity-30 pointer-events-none" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center space-y-6">
        {/* Logo container */}
        <div className="relative w-40 h-40 flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 rounded-full border-2 border-[#1677FF]/40 animate-pulse" />
          <div className="relative z-10 w-28 h-28 bg-gradient-to-br from-[#1677FF] to-[#8B5CF6] rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(22,119,255,0.6)]">
            <svg className="w-14 h-14 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">BuildAI</h2>
          <p className="mt-2 text-[#9EB7D3] text-sm">Qurilish texnologiyalari</p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs mt-10">
          <div className="flex justify-between text-xs text-[#6B7C93] mb-2">
            <span>Yuklanmoqda...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full bg-[#0A1D33] rounded-full overflow-hidden border border-[#174D78]">
            <div
              className="h-full bg-gradient-to-r from-[#1677FF] via-[#29B6FF] to-[#8B5CF6] shadow-[0_0_15px_rgba(22,119,255,0.6)] transition-all duration-300"
              style={{ width: progress + '%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
`);

// ---------- App.tsx ----------
write('App.tsx', `import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { Layout } from '@/components/layout';
import { NavProvider } from '@/context/NavContext';
import { HomePage } from '@/pages/Home';
import { CalculatorPage } from '@/pages/Calculator';
import { CameraPage } from '@/pages/Camera';
import { CounterPage } from '@/pages/Counter';
import { PlannerPage } from '@/pages/Planner';
import { MaterialsPage } from '@/pages/Materials';
import { ShopPage } from '@/pages/Shop';
import { ProjectsPage } from '@/pages/Projects';
import { SettingsPage } from '@/pages/Settings';
import { SplashScreen } from '@/pages/Splash';

const PAGES: Record<string, React.ComponentType<any>> = {
  home: HomePage,
  calculator: CalculatorPage,
  camera: CameraPage,
  counter: CounterPage,
  planner: PlannerPage,
  materials: MaterialsPage,
  shop: ShopPage,
  projects: ProjectsPage,
  settings: SettingsPage,
};

export default function App() {
  const { theme, user } = useAppStore();
  const [activePage, setActivePage] = useState('splash');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
    setMounted(true);
  }, [theme]);

  useEffect(() => {
    if (activePage === 'splash') {
      const t = setTimeout(() => setActivePage('home'), 3200);
      return () => clearTimeout(t);
    }
  }, [activePage]);

  const PageComponent = PAGES[activePage] || HomePage;

  return (
    <NavProvider activePage={activePage}>
      <div className="min-h-screen bg-[#061426]">
        {activePage === 'splash' ? (
          <SplashScreen onFinish={() => setActivePage('home')} />
        ) : (
          <Layout user={user} activePage={activePage} onPageChange={setActivePage}>
            <PageComponent />
          </Layout>
        )}
      </div>
    </NavProvider>
  );
}
`);

// ---------- Layout.tsx ----------
write('components/layout/Layout.tsx', `import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  user: any;
  children: React.ReactNode;
  activePage: string;
  onPageChange: (page: string) => void;
}

export function Layout({ user, children, activePage, onPageChange }: LayoutProps) {
  const { language, setLanguage } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="relative min-h-screen">
      {!isMobile && (
        <>
          <Sidebar open={true} onClose={() => setSidebarOpen(false)} />
          <main className="pt-16 pb-24 ml-80 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-6">{children}</div>
          </main>
        </>
      )}

      {isMobile && (
        <>
          <Navbar onMenuClick={() => setSidebarOpen(true)} language={language} setLanguage={setLanguage} />
          <main className="pt-16 pb-32 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-6">{children}</div>
          </main>
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <BottomNav activePage={activePage} onPageChange={onPageChange} />
        </>
      )}
    </div>
  );
}
`);

// ---------- Home.tsx ----------
write('pages/Home.tsx', `import { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { t } from '@/translations';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useNav } from '@/context/NavContext';
import {
  Camera, Barcode, Calculator, LayoutGrid, Package, ShoppingCart, Folder, Settings,
  ArrowRight, Layout, Crown
} from 'lucide-react';

interface FeatureCard {
  icon: React.ComponentType<any>;
  title: string;
  desc: string;
  page: string;
  gradient: string;
}

const features: FeatureCard[] = [
  { icon: Camera, title: 'AI Kamera', desc: "Kamera bilan o'lchash", page: 'camera', gradient: 'from-[#1677FF]/20 to-[#29B6FF]/20' },
  { icon: Barcode, title: 'AI Sanash', desc: 'Rasmga obyektlarni sanash', page: 'counter', gradient: 'from-[#29B6FF]/20 to-[#1677FF]/20' },
  { icon: Calculator, title: 'Kalkulyator', desc: 'Oddiy, ilmiy va maxfiy', page: 'calculator', gradient: 'from-[#22C99A]/20 to-[#1677FF]/20' },
  { icon: LayoutGrid, title: 'Uy loyihasi', desc: '2D/3D uy chizimi', page: 'planner', gradient: 'from-[#1677FF]/20 to-[#22C99A]/20' },
  { icon: Package, title: 'Materiallar', desc: 'Qurilish materiallarini hisoblash', page: 'materials', gradient: 'from-[#29B6FF]/20 to-[#22C99A]/20' },
  { icon: ShoppingCart, title: "Do'kon", desc: 'Materiallarni xarid qilish', page: 'shop', gradient: 'from-[#22C99A]/20 to-[#29B6FF]/20' },
  { icon: Folder, title: 'Loyihalarim', desc: 'Saqlangan loyihalar', page: 'projects', gradient: 'from-[#1677FF]/20 to-[#29B6FF]/20' },
  { icon: Settings, title: 'Sozlamalar', desc: 'Foydalanuvchi va ilova sozlamalari', page: 'settings', gradient: 'from-[#29B6FF]/20 to-[#1677FF]/20' },
];

export function HomePage() {
  const { language, user } = useAppStore();
  const { setActivePage } = useNav();
  const [visibleFeatures, setVisibleFeatures] = useState<boolean[]>([]);

  useEffect(() => {
    const featureTimer = setTimeout(() => {
      setVisibleFeatures(features.map((_, i) => i < 4));
    }, 300);
    const featureTimer2 = setTimeout(() => {
      setVisibleFeatures(features.map(() => true));
    }, 700);
    return () => {
      clearTimeout(featureTimer);
      clearTimeout(featureTimer2);
    };
  }, [features.length]);

  const goTo = (page: string) => setActivePage(page);

  return (
    <div className="min-h-screen relative overflow-hidden px-6 pt-20 pb-24 max-w-4xl mx-auto">
      <div className="absolute inset-0 bg-[#061426]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#1677FF]/10 rounded-full blur-[100px] -mt-24" />
        <div className="absolute bottom-0 right-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#22C99A]/10 rounded-full blur-[100px] -mb-24" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[#9EB7D3] text-sm">{t(language, 'welcome')}</span>
          <h1 className="text-2xl font-bold text-[#F5F8FF]">{user?.name || 'Foydalanuvchi'} <Crown className="w-4 h-4 inline text-[#F5F8FF]" /></h1>
        </div>
        <p className="text-[#9EB7D3] text-sm mb-8 max-w-md">{t(language, 'subtitle')}</p>

        <div className="grid grid-cols-2 gap-4">
          {features.map((feature, index) => (
            <Card
              key={feature.page}
              hoverable
              className="cursor-pointer group p-5"
              onClick={() => goTo(feature.page)}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${feature.gradient} group-hover:bg-[#1677FF]/40 transition-colors`}>
                <feature.icon className="w-5 h-5 text-[#1677FF] group-hover:text-white" />
              </div>
              <h3 className="text-base font-semibold text-[#F5F8FF] mb-1">{feature.title}</h3>
              <p className="text-xs text-[#9EB7D3]">{feature.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
`);

console.log('done phase 2');
console.log('done phase 1');