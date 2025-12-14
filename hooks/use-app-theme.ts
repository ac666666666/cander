import { create } from 'zustand';

export type ThemeName = 'light' | 'warm' | 'dark';

type AppThemeState = {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  cycleTheme: () => void;
};

export const useAppThemeStore = create<AppThemeState>((set, get) => ({
  theme: 'light',
  setTheme: (t) => set({ theme: t }),
  cycleTheme: () => {
    const order: ThemeName[] = ['light', 'warm', 'dark'];
    const curr = get().theme;
    const idx = order.indexOf(curr);
    const next = order[(idx + 1) % order.length];
    set({ theme: next });
  },
}));

export function useAppTheme(): ThemeName {
  return useAppThemeStore((s) => s.theme);
}