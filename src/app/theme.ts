export type ThemeName = 'cottage' | 'fireside';

export const THEME_STORAGE_KEY = 'cozy-theme';

const THEME_COLOR: Record<ThemeName, string> = {
  cottage: '#f7efe2', // keep in sync with --color-bg in theme.css
  fireside: '#241b16',
};

export function getSavedTheme(): ThemeName | null {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    return t === 'cottage' || t === 'fireside' ? t : null;
  } catch {
    return null;
  }
}

export function getDeviceTheme(): ThemeName {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'fireside' : 'cottage';
}

/** Sets <html data-theme>, the browser theme-color, and remembers the choice. */
export function applyTheme(theme: ThemeName) {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', THEME_COLOR[theme]));
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode etc. — the theme still applies for this visit.
  }
}
