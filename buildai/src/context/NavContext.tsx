import { createContext, useContext, ReactNode } from 'react';

interface NavCtx {
  activePage: string;
  setActivePage: (page: string) => void;
}

const NavContext = createContext<NavCtx | null>(null);

export function NavProvider({
  children,
  activePage,
  onPageChange,
}: {
  children: ReactNode;
  activePage: string;
  onPageChange: (page: string) => void;
}) {
  return (
    <NavContext.Provider value={{ activePage, setActivePage: onPageChange }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within NavProvider');
  return ctx;
}