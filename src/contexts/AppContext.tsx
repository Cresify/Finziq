import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { seedDatabase, getById, putItem, ACCENT_PRESETS, type AppSettings, type DashboardWidget } from '@/db/database';

interface AppContextType {
  settings: AppSettings | undefined;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  refreshFlag: number;
  refresh: () => void;
  isReady: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'kpi', label: 'Resumen KPI', visible: true, order: 0 },
  { id: 'donut', label: 'Distribución gastos', visible: true, order: 1 },
  { id: 'trend', label: 'Evolución mensual', visible: true, order: 2 },
  { id: 'budget', label: 'Presupuestos', visible: true, order: 3 },
  { id: 'top-leaks', label: 'Top fugas', visible: true, order: 4 },
];

const DEFAULT_SETTINGS: AppSettings = {
  id: 'singleton',
  base_currency: 'CLP',
  theme_mode: 'light',
  accent_color: 'emerald',
  dashboard_layout: DEFAULT_WIDGETS,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | undefined>();
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(() => setRefreshFlag(f => f + 1), []);

  const loadSettings = useCallback(async () => {
    try {
      await seedDatabase();

      let loadedSettings = await getById<AppSettings>('settings', 'singleton');

      if (!loadedSettings) {
        loadedSettings = DEFAULT_SETTINGS;
        await putItem('settings', loadedSettings);
      }

      setSettings(loadedSettings);
    } catch (error) {
      console.error('Error inicializando settings:', error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!isReady) return;
    loadSettings();
  }, [refreshFlag, isReady, loadSettings]);

  useEffect(() => {
    if (!settings) return;

    const root = document.documentElement;

    if (settings.theme_mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const accent = ACCENT_PRESETS[settings.accent_color] || ACCENT_PRESETS.emerald;
    const l = settings.theme_mode === 'dark' ? Math.min(accent.l + 8, 68) : accent.l;

    root.style.setProperty('--primary', `${accent.h} ${accent.s}% ${l}%`);
    root.style.setProperty('--ring', `${accent.h} ${accent.s}% ${l}%`);
    root.style.setProperty('--accent', `${accent.h} ${Math.round(accent.s * 0.4)}% ${settings.theme_mode === 'dark' ? 16 : 93}%`);
    root.style.setProperty('--accent-foreground', `${accent.h} ${Math.round(accent.s * 0.7)}% ${settings.theme_mode === 'dark' ? 70 : 25}%`);
  }, [settings]);

  const updateSettings = async (updates: Partial<AppSettings>) => {
    if (!settings) return;
    const updated = { ...settings, ...updates };
    await putItem('settings', updated);
    setSettings(updated);
  };

  return (
    <AppContext.Provider value={{ settings, updateSettings, refreshFlag, refresh, isReady }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}