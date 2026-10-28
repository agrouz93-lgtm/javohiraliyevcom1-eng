import React, { useState, useEffect, Suspense } from 'react';
import { useAppStore } from '@/store';
import { Layout } from '@/components/layout';
import { NavProvider } from '@/context/NavContext';
import { HomePage } from '@/pages/Home';
import { CalculatorPage } from '@/pages/Calculator';
import { CameraPage } from '@/pages/Camera';
import { CounterPage } from '@/pages/Counter';
import { MaterialsPage } from '@/pages/Materials';
import { ShopPage } from '@/pages/Shop';
import { ProjectsPage } from '@/pages/Projects';
import { SettingsPage } from '@/pages/Settings';
import { SplashScreen } from '@/pages/Splash';

// three.js katta — Planner faqat ochilganda yuklansin
const PlannerPage = React.lazy(() =>
  import('@/pages/Planner').then((m) => ({ default: m.PlannerPage }))
);

const PAGES: Record<string, React.ComponentType<any>> = {
  home: HomePage,
  calculator: CalculatorPage,
  camera: CameraPage,
  counter: CounterPage,
  planner: PlannerPage as React.ComponentType<any>,
  materials: MaterialsPage,
  shop: ShopPage,
  projects: ProjectsPage,
  settings: SettingsPage,
  newProject: ProjectsPage,
};

export default function App() {
  const { theme } = useAppStore();
  const [activePage, setActivePage] = useState('splash');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [theme]);

  // Auto transition from splash to home (animation completes via Splash onFinish)
  useEffect(() => {
    if (activePage === 'splash') {
      const t = setTimeout(() => setActivePage('home'), 3400);
      return () => clearTimeout(t);
    }
  }, [activePage, setActivePage]);

  const PageComponent = PAGES[activePage] || HomePage;
  const pageProps = activePage === 'newProject' ? { openNewProject: true } : {};

  return (
    <NavProvider activePage={activePage} onPageChange={setActivePage}>
      <div className="min-h-screen bg-[#061426]">
        {activePage === 'splash' ? (
          <SplashScreen onFinish={() => setActivePage('home')} />
        ) : (
          <Layout activePage={activePage} onPageChange={setActivePage}>
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-24 text-[#9EB7D3] text-sm">
                  <span className="w-6 h-6 border-2 border-[#1677FF]/30 border-t-[#1677FF] rounded-full animate-spin mr-3" />
                  3D sahna yuklanmoqda...
                </div>
              }
            >
              <PageComponent {...pageProps} />
            </Suspense>
          </Layout>
        )}
      </div>
    </NavProvider>
  );
}