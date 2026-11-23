export type ThemePreference = 'system' | 'light' | 'dark';
export const themeKey = 'gastos.theme';

export function loadTheme(): ThemePreference {
  try {
    const saved = localStorage.getItem(themeKey);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

export function saveTheme(preference: ThemePreference): boolean {
  try {
    localStorage.setItem(themeKey, preference);
    return true;
  } catch {
    return false;
  }
}
