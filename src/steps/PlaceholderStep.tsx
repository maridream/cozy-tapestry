import './PlaceholderStep.css';

/** Phase 1 stand-in for steps that later phases build. */
export function PlaceholderStep() {
  return (
    <div className="placeholder-step">
      <p className="placeholder-step__badge">Coming soon</p>
      <p>This step is still being stitched together. You can look around with Back and Next.</p>
    </div>
  );
}
