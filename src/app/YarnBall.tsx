/** The Cozy Tapestry mark: a ball of yarn with a loose tail. Same drawing as the favicon in index.html. */
export function YarnBall({ size = 40 }: { size?: number }) {
  return (
    <svg className="yarn-ball" viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" focusable="false">
      <path d="M36 33c4 5 7 7 10 11" fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="23" cy="23" r="17" fill="var(--color-accent)" />
      <g fill="none" stroke="var(--color-on-accent)" strokeWidth="2.2" strokeLinecap="round" opacity="0.85">
        <path d="M9 18c8-6 20-7 29 1" />
        <path d="M7 25c9-7 23-7 32 2" />
        <path d="M11 33c8-7 19-7 26 0" />
        <path d="M19 7c-5 9-4 22 3 32" />
      </g>
    </svg>
  );
}
