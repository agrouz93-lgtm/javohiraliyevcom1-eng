import { useState } from 'react';
import { useAppStore } from '@/store';
import { t } from '@/translations';
import {
  Menu, Sun, Moon, Bell, User, Settings, CheckCheck,
  Search, Wallet, Plus, Package,
} from 'lucide-react';
import { NAV_ITEMS } from '@/data/navItems';
import { SHOP_ITEMS } from '@/data/products';

interface NavbarProps {
  onMenuClick: () => void;
  menuOpen?: boolean;
  onNavigate?: (page: string) => void;
}

export function Navbar({ onMenuClick, menuOpen = false, onNavigate }: NavbarProps) {
  const {
    user,
    language: lang,
    setLanguage,
    theme,
    setTheme,
    notifications,
    markNotificationsRead,
    balance,
    addBalance,
  } = useAppStore();

  const [panel, setPanel] = useState<'bell' | 'profile' | null>(null);
  const unread = notifications.filter((n) => !n.read).length;

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const q = query.trim().toLowerCase();
  const pageResults = q ? NAV_ITEMS.filter((n) => t(lang, n.label).toLowerCase().includes(q)).slice(0, 5) : [];
  const productResults = q ? SHOP_ITEMS.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5) : [];
  const hasResults = pageResults.length + productResults.length > 0;

  const pickResult = (page: string) => {
    onNavigate?.(page);
    setQuery('');
    setSearchOpen(false);
  };

  const resultsList = (
    <div className="max-h-72 overflow-y-auto">
      {pageResults.map((n) => (
        <button
          key={n.page}
          onClick={() => pickResult(n.page)}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[#9EB7D3] hover:text-[#F5F8FF] hover:bg-[#102943] transition-colors"
        >
          <n.icon className="w-4 h-4 shrink-0" />
          <span className="truncate">{t(lang, n.label)}</span>
        </button>
      ))}
      {productResults.map((p) => (
        <button
          key={p.id}
          onClick={() => pickResult('shop')}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[#9EB7D3] hover:text-[#F5F8FF] hover:bg-[#102943] transition-colors"
        >
          <Package className="w-4 h-4 shrink-0 text-[#29B6FF]" />
          <span className="truncate">{p.name}</span>
          <span className="ml-auto text-xs text-[#29B6FF] whitespace-nowrap">{p.price.toLocaleString()} so'm</span>
        </button>
      ))}
      {!hasResults && (
        <p className="px-3 py-4 text-sm text-[#6B7C93] text-center">{t(lang, 'noResults')}</p>
      )}
    </div>
  );

  const togglePanel = (which: 'bell' | 'profile') =>
    setPanel((current) => (current === which ? null : which));

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-16 bg-[#061426]/85 backdrop-blur-md border-b border-[#174D78] z-50">
        <div className="h-full px-4 md:px-6 flex items-center justify-between gap-3">
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onMenuClick}
              aria-label="Menyu"
              aria-expanded={menuOpen}
              className={`p-2 rounded-lg text-[#9EB7D3] hover:text-[#F5F8FF] hover:bg-[#102943] transition-colors ${
                menuOpen ? 'bg-[#102943] text-[#F5F8FF]' : ''
              }`}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#E040FB] to-[#FF4D9D] flex items-center justify-center shrink-0 shadow-[0_0_14px_rgba(224,64,251,0.4)]">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 10.5 12 3.5l9 7" />
                  <path d="M6.5 11.5V20" />
                  <path d="M17.5 11.5V20" />
                  <path d="M6.5 20h11" />
                </svg>
              </div>
              <span className="font-bold text-lg text-[#F5F8FF] tracking-tight truncate">
                {t(lang, 'appName')}
              </span>
            </div>
          </div>

          {/* Right: language, theme, notifications, profile */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <select
              value={lang}
              onChange={(e) => setLanguage(e.target.value as any)}
              aria-label={t(lang, 'language')}
              className="hidden sm:block bg-[#102943] border border-[#174D78] rounded-lg text-[#F5F8FF] text-sm px-2 py-1.5 focus:outline-none focus:border-[#1677FF] cursor-pointer"
            >
              <option value="uz">O'zbek</option>
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>

            {/* search (desktop) */}
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7C93] pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t(lang, 'search')}
                aria-label={t(lang, 'search')}
                className="w-40 lg:w-56 bg-[#102943] border border-[#174D78] rounded-lg text-[#F5F8FF] text-sm pl-8 pr-3 py-2 focus:outline-none focus:border-[#1677FF]"
              />
              {q && (
                <div className="absolute top-full mt-2 w-72 bg-[#0A1D33] border border-[#174D78] rounded-xl shadow-2xl overflow-hidden z-[60] animate-fade-in">
                  {resultsList}
                </div>
              )}
            </div>

            {/* search (mobile toggle) */}
            <button
              onClick={() => setSearchOpen((o) => !o)}
              aria-label={t(lang, 'search')}
              className={`md:hidden p-2 rounded-lg text-[#9EB7D3] hover:text-[#F5F8FF] hover:bg-[#102943] transition-colors ${
                searchOpen ? 'bg-[#102943] text-[#F5F8FF]' : ''
              }`}
            >
              <Search className="w-5 h-5" />
            </button>

            {/* demo balance */}
            <div
              className="flex items-center gap-1.5 bg-[#102943] border border-[#1677FF]/40 rounded-lg pl-2.5 pr-1 py-1"
              title={t(lang, 'demoFunds')}
            >
              <Wallet className="w-4 h-4 text-[#29B6FF]" />
              <span className="text-sm font-semibold text-[#F5F8FF] tabular-nums">{balance.toLocaleString()}</span>
              <span className="text-[11px] text-[#9EB7D3] hidden sm:inline">so'm</span>
              <button
                onClick={() => addBalance(50000)}
                aria-label={t(lang, 'topUp')}
                title={t(lang, 'topUp')}
                className="ml-0.5 w-6 h-6 rounded-md bg-[#1677FF] hover:bg-[#29B6FF] text-white flex items-center justify-center transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? t(lang, 'lightTheme') : t(lang, 'darkTheme')}
              className="p-2 rounded-lg text-[#9EB7D3] hover:text-[#F5F8FF] hover:bg-[#102943] transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={() => togglePanel('bell')}
              aria-label={t(lang, 'notifications')}
              aria-expanded={panel === 'bell'}
              className={`relative p-2 rounded-lg text-[#9EB7D3] hover:text-[#F5F8FF] hover:bg-[#102943] transition-colors ${
                panel === 'bell' ? 'bg-[#102943] text-[#F5F8FF]' : ''
              }`}
            >
              <Bell className="w-5 h-5" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF4D6D] text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#061426]">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>

            <button
              onClick={() => togglePanel('profile')}
              aria-label={t(lang, 'profile')}
              aria-expanded={panel === 'profile'}
              className={`w-9 h-9 rounded-full bg-[#102943] border transition-colors flex items-center justify-center text-sm font-bold text-[#F5F8FF] ${
                panel === 'profile'
                  ? 'border-[#1677FF] text-[#29B6FF]'
                  : 'border-[#174D78] hover:border-[#1677FF]'
              }`}
            >
              {user?.name ? user.name.slice(0, 1).toUpperCase() : <User className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </nav>

      {/* search (mobile row) */}
      {searchOpen && (
        <div className="fixed top-16 left-0 right-0 md:hidden bg-[#0A1D33] border-b border-[#174D78] p-3 z-[54] animate-fade-in">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7C93] pointer-events-none" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(lang, 'search')}
              aria-label={t(lang, 'search')}
              className="w-full bg-[#102943] border border-[#174D78] rounded-lg text-[#F5F8FF] text-sm pl-9 pr-3 py-2.5 focus:outline-none focus:border-[#1677FF]"
            />
          </div>
          {q && (
            <div className="mt-2 bg-[#0A1D33] border border-[#174D78] rounded-xl overflow-hidden">
              {resultsList}
            </div>
          )}
        </div>
      )}

      {/* Click-away layer for the dropdown panels */}
      {panel && <div className="fixed inset-0 z-[55]" onClick={() => setPanel(null)} />}

      {/* Notifications panel */}
      {panel === 'bell' && (
        <div className="fixed top-16 right-3 sm:right-4 z-[56] w-[calc(100vw-1.5rem)] max-w-sm bg-[#0A1D33] border border-[#174D78] rounded-xl shadow-2xl overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#174D78]">
            <span className="font-semibold text-[#F5F8FF] text-sm">{t(lang, 'notifications')}</span>
            {unread > 0 && (
              <button
                onClick={markNotificationsRead}
                className="flex items-center gap-1 text-xs text-[#29B6FF] hover:text-[#F5F8FF] transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {t(lang, 'markAllRead')}
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[#6B7C93]">{t(lang, 'noNotifications')}</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-[#174D78]/60 last:border-b-0 flex gap-3 ${
                    n.read ? 'opacity-70' : ''
                  }`}
                >
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      n.read ? 'bg-[#6B7C93]' : 'bg-[#1677FF] shadow-[0_0_8px_rgba(22,119,255,0.8)]'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-[#F5F8FF] font-medium truncate">{t(lang, n.titleKey)}</p>
                    {n.body && <p className="text-xs text-[#9EB7D3] truncate">{n.body}</p>}
                    <p className="text-[10px] text-[#6B7C93] mt-0.5">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Profile panel */}
      {panel === 'profile' && (
        <div className="fixed top-16 right-3 sm:right-4 z-[56] w-64 bg-[#0A1D33] border border-[#174D78] rounded-xl shadow-2xl overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-[#174D78]">
            <p className="text-sm font-semibold text-[#F5F8FF] truncate">{user?.name || '—'}</p>
            <p className="text-xs text-[#9EB7D3] truncate">{user?.email || t(lang, 'profile')}</p>
          </div>
          <button
            onClick={() => {
              setPanel(null);
              onNavigate?.('settings');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#9EB7D3] hover:text-[#F5F8FF] hover:bg-[#102943] transition-colors"
          >
            <Settings className="w-4 h-4" />
            {t(lang, 'settings')}
          </button>
        </div>
      )}
    </>
  );
}
