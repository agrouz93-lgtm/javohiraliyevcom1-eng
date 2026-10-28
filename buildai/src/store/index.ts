import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Project, Language, Theme, Unit, Measurement, AppNotification, Order, OrderItem } from '@/types';

interface AppState {
  user: User | null;
  projects: Project[];
  currentProject: Project | null;
  measurements: Measurement[];
  notifications: AppNotification[];
  balance: number; // demo balance in so'm
  orders: Order[];
  language: Language;
  theme: Theme;
  unit: Unit;
  appPin: string | null;
  pendingCountImage: string | null; // AI Sanashga o'tkazilgan kamera/rasm

  setUser: (user: User | null) => void;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  setUnit: (unit: Unit) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  addMeasurement: (m: Measurement) => void;
  deleteMeasurement: (id: string) => void;
  setMeasurements: (ms: Measurement[]) => void;
  markNotificationsRead: () => void;
  pushNotification: (titleKey: string, body?: string) => void;
  addBalance: (amount: number) => void;
  placeOrder: (items: OrderItem[]) => { ok: boolean; message: string };
  setAppPin: (pinHash: string | null) => void;
  verifyPin: (pin: string) => Promise<boolean>;
  setPendingCountImage: (url: string | null) => void;
}

const defaultUser: User = {
  id: 'user-1',
  name: 'Jusrbek',
  email: '',
  language: 'uz',
  theme: 'dark',
  unit: 'm',
  premium: false,
  createdAt: new Date(),
};

const sha256 = async (text: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get, api) => ({
      user: defaultUser,
      projects: [],
      currentProject: null,
      measurements: [],
      language: 'uz',
      theme: 'dark',
      unit: 'm',
      appPin: null,
      pendingCountImage: null,
      setPendingCountImage: (url) => set({ pendingCountImage: url }),
      balance: 7_000_000_000,
      orders: [],
      addBalance: (amount) => {
        if (!Number.isFinite(amount) || amount <= 0) return;
        set((state) => ({ balance: state.balance + amount }));
        get().pushNotification('notifBalanceAdded', `${amount.toLocaleString()} so'm`);
      },
      placeOrder: (items) => {
        const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);
        if (total <= 0) return { ok: false, message: 'Savat bo\'sh' };
        if (total > get().balance) {
          const shortfall = total - get().balance;
          return {
            ok: false,
            message: `Balans yetarli emas. ${shortfall.toLocaleString()} so'm yetishmayapti`,
          };
        }
        const order: Order = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          items,
          total,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          balance: state.balance - total,
          orders: [order, ...state.orders],
        }));
        get().pushNotification('notifOrderDone', `${total.toLocaleString()} so'm`);
        return { ok: true, message: `Buyurtma qabul qilindi. ${total.toLocaleString()} so'm yechildi` };
      },
      notifications: [
        {
          id: 'welcome',
          titleKey: 'notifWelcome',
          body: 'USTAPRO ishga tushdi',
          read: false,
          createdAt: new Date(),
        },
      ],
      pushNotification: (titleKey, body) =>
        set((state) => ({
          notifications: [
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              titleKey,
              body,
              read: false,
              createdAt: new Date(),
            },
            ...state.notifications,
          ].slice(0, 30),
        })),
      markNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),
      setUser: (user) => set({ user }),
      setLanguage: (lang) => set({ language: lang }),
      setTheme: (theme) => {
        set({ theme });
        if (theme === 'light') {
          document.documentElement.classList.add('light');
        } else {
          document.documentElement.classList.remove('light');
        }
      },
      setUnit: (unit) => set({ unit }),
      addProject: (project) => {
        set((state) => ({
          projects: [...state.projects, project],
          currentProject: project,
        }));
        get().pushNotification('notifProjectCreated', project.name);
      },
      updateProject: (project) => set((state) => ({
        projects: state.projects.map((p) => p.id === project.id ? project : p),
        currentProject: state.currentProject?.id === project.id ? project : state.currentProject,
      })),
      deleteProject: (id) => {
        const removed = get().projects.find((p) => p.id === id);
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProject: state.currentProject?.id === id ? null : state.currentProject,
        }));
        if (removed) get().pushNotification('notifProjectDeleted', removed.name);
      },
      setCurrentProject: (project) => set({ currentProject: project }),
      setProjects: (projects) => set({ projects }),
      addMeasurement: (m) => {
        set((state) => ({
          measurements: [...state.measurements, m],
        }));
        get().pushNotification('notifMeasurementSaved');
      },
      deleteMeasurement: (id) => set((state) => ({
        measurements: state.measurements.filter((m) => m.id !== id),
      })),
      setMeasurements: (ms) => set({ measurements: ms }),
      setAppPin: (pinHash) => set({ appPin: pinHash }),
      verifyPin: async (pin): Promise<boolean> => {
        const appPin = get().appPin;
        if (!appPin) return false;
        const hash = await sha256(pin);
        return hash === appPin;
      },
    }),
    {
      name: 'buildai-storage',
      version: 1,
      // Eski saqlangan balans (70 000 va h.k.) yangi boshlang'ich qiymatga ko'tariladi
      migrate: (persisted: any) => ({
        ...(persisted as object),
        balance: 7_000_000_000,
      }),
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        projects: state.projects,
        measurements: state.measurements,
        language: state.language,
        theme: state.theme,
        unit: state.unit,
        appPin: state.appPin,
        pendingCountImage: state.pendingCountImage,
        notifications: state.notifications,
        balance: state.balance,
        orders: state.orders,
      }),
    }
  )
);
