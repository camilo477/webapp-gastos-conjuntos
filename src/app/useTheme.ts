import { useEffect, useState } from 'react';
import { loadTheme, saveTheme } from './theme';
import type { ThemePreference } from './theme';

export function useTheme() {
  const [preference, setPreference] = useState(loadTheme);
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preference]);
  function changeTheme(value: ThemePreference) {
    setPreference(value);
    setSaved(saveTheme(value));
  }
  return { preference, changeTheme, saved };
}
