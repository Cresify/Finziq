import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { seedDatabase, getAll, getById, putItem, ACCENT_PRESETS, type AppSettings } from '@/db/database';

interface AppContextType {
  settings: AppSettings | undefined;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  refreshFlag: number;
  refresh: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | undefined>();
  const [refreshFlag, setRefreshFlag] = useState(0);

  const refresh = useCallback(() => setRefreshFlag(f => f + 1), []);

  useEffect(() => {
    seedDatabase().then(() => {
      getById<AppSettings>('settings', 'singleton').then(setSettings);
    });
  }, []);

  useEffect(() => {
    getById<AppSettings>('settings', 'singleton').then(s => { if (s) setSettings(s); });
  }, [refreshFlag]);

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
    <AppContext.Provider value={{ settings, updateSettings, refreshFlag, refresh }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
