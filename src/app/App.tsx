import { WIZARD_STEPS } from '../config/steps';

/**
 * SCAFFOLD PLACEHOLDER — replaced in Phase 1 (docs/phase-1/README.md).
 *
 * Shows the planned wizard steps so the dev server has something to render.
 * Phase 1 turns this into the real shell: header, theme toggle, stepper,
 * Back/Next navigation and the Upload step.
 */
export function App() {
  return (
    <main className="scaffold">
      <h1>Cozy Tapestry</h1>
      <p>
        Turn a photo of your pet into a crochet pattern. This is the project
        scaffold — the app itself is built phase by phase (see <code>docs/</code>).
      </p>
      <ol className="scaffold-steps">
        {WIZARD_STEPS.map((step) => (
          <li key={step.id}>
            <strong>{step.title}</strong> — {step.summary}
            <span className="scaffold-phase">Phase {step.phase}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
