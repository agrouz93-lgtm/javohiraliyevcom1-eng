import { useAppStore } from '@/store';
import { t } from '@/translations';
import { NAV_ITEMS } from '@/data/navItems';

const primaryPages = ['home', 'camera', 'calculator', 'planner', 'projects'];
const navItems = primaryPages.flatMap((page) => NAV_ITEMS.filter((item) => item.page === page));

interface BottomNavProps {
  activePage: string;
  onPageChange: (page: string) => void;
}

export function BottomNav({ activePage, onPageChange }: BottomNavProps) {
  const { language } = useAppStore();

  return (
    <nav aria-label={t(language, 'home')} className="fixed bottom-0 left-0 right-0 bg-[#061426] border-t border-[#174D78] z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5 px-2">
        {navItems.map((item) => {
          const isActive = activePage === item.page;
          return (
            <button
              key={item.page}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onPageChange(item.page)}
              className={`flex flex-col items-center justify-center min-w-0 h-full gap-1 rounded-lg transition-colors px-1 ${
                isActive ? 'bg-[#102943] text-[#1677FF]' : 'text-[#6B7C93] hover:text-[#9EB7D3] hover:bg-[#0A1D33]'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? '' : 'opacity-70'}`} />
              <span className={`max-w-full truncate text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                {t(language, item.label)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
