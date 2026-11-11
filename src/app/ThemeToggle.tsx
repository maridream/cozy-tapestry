import { useEffect, useState } from 'react';
import { applyTheme, getDeviceTheme, getSavedTheme, type ThemeName } from './theme';
import './ThemeToggle.css';

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeName>(() => getSavedTheme() ?? getDeviceTheme());

  // Until the user picks a theme, follow the device if it changes.
  useEffect(() => {
    if (getSavedTheme()) return;
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = () => {
      if (!getSavedTheme()) setTheme(mq.matches ? 'fireside' : 'cottage');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const other: ThemeName = theme === 'cottage' ? 'fireside' : 'cottage';

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Switch to ${other} theme`}
      title={`Switch to ${other} theme`}
      onClick={() => {
        applyTheme(other);
        setTheme(other);
      }}
    >
      {theme === 'cottage' ? <SunIcon /> : <FireIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
      </g>
    </svg>
  );
}

function FireIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 2.5c.6 3-1.2 4.6-2.8 6.3C7.6 10.5 6 12.3 6 15a6 6 0 0 0 12 0c0-2.6-1.3-4.3-2.4-5.6-.3 1.4-1 2.4-2 2.9.4-3.5-.6-7.2-1.6-9.8Zm0 18a3 3 0 0 1-3-3c0-1.6 1.2-2.6 2.2-3.6.3 1 1 1.8 2 2.1.6-.6.9-1.3 1-2 .5.8.8 1.6.8 2.5a3 3 0 0 1-3 4Z"
      />
    </svg>
  );
}
