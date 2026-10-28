import React from 'react';
import { useAppStore } from '@/store';
import { useNav } from '@/context/NavContext';
import { t } from '@/translations';
import { HardHat, X } from 'lucide-react';
import { NAV_ITEMS } from '@/data/navItems';

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { language } = useAppStore();
  const { activePage, setActivePage } = useNav();

  return (
    <>
      {/* Mobile-only dim layer: tap to close */}
      {open && (
        <div
          className="fixed inset-0 top-16 bg-black/50 z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-hidden={!open}
        className={`fixed top-16 bottom-0 left-0 w-80 max-w-[85vw] z-40 bg-[#0A1D33] border-r border-[#174D78] shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full invisible'
        }`}
      >
        <div className="h-16 px-5 border-b border-[#174D78] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1677FF] to-[#29B6FF] flex items-center justify-center shadow-[0_0_16px_rgba(22,119,255,0.45)]">
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <span className="font-bold text-[#F5F8FF] tracking-tight">USTAPRO</span>
              <span className="block text-[11px] text-[#6B7C93]">Qurilish platformasi</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t(language, 'close')}
            className="p-2 rounded-lg text-[#9EB7D3] hover:text-[#F5F8FF] hover:bg-[#102943] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.page;
            return (
              <button
                key={item.page}
                onClick={() => {
                  setActivePage(item.page);
                  onClose();
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#1677FF]/15 text-[#29B6FF] border border-[#1677FF]/40 shadow-[0_0_14px_rgba(22,119,255,0.18)]'
                    : item.accent
                    ? 'text-[#9EB7D3] border border-dashed border-[#174D78] hover:text-[#F5F8FF] hover:border-[#1677FF]/60 hover:bg-[#102943]'
                    : 'text-[#9EB7D3] border border-transparent hover:text-[#F5F8FF] hover:bg-[#102943]'
                }`}
              >
                <item.icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? 'text-[#29B6FF]' : item.accent ? 'text-[#1677FF]' : ''
                  }`}
                />
                <span className="truncate">{t(language, item.label)}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#174D78] text-[11px] text-[#6B7C93]">
          USTAPRO · Qurilish texnologiyalari
        </div>
      </aside>
    </>
  );
}
