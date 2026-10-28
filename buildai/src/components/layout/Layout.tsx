import React, { useState, useEffect } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onPageChange: (page: string) => void;
}

export function Layout({ children, activePage, onPageChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Escape closes the menu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Menu always closes after navigating to a page
  useEffect(() => {
    setSidebarOpen(false);
  }, [activePage]);

  return (
    <div className="min-h-screen relative">
      <Navbar onMenuClick={() => setSidebarOpen((o) => !o)} menuOpen={sidebarOpen} onNavigate={onPageChange} />

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main
        className={`pt-16 transition-[margin] duration-300 ${sidebarOpen ? 'md:ml-80' : 'ml-0'} ${
          isMobile ? 'pb-28' : 'pb-12'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6">{children}</div>
      </main>

      {isMobile && <BottomNav activePage={activePage} onPageChange={onPageChange} />}
    </div>
  );
}
