import { WIZARD_STEPS } from '../config/steps';
import { canGoToStep, goToStep, isStepComplete, stepIndex, useApp } from './state';
import './Stepper.css';

export function Stepper() {
  const { state, dispatch } = useApp();
  const current = stepIndex(state.step);
  const total = WIZARD_STEPS.length;

  return (
    <nav className="stepper" aria-label="Steps">
      <ol className="stepper__list">
        {WIZARD_STEPS.map((step, i) => {
          const isCurrent = i === current;
          const done = !isCurrent && isStepComplete(state, step.id) && i < current;
          const reachable = !isCurrent && canGoToStep(state, step.id);
          const status = isCurrent ? 'current' : done ? 'done' : reachable ? 'open' : 'locked';
          const badge = (
            <span className="stepper__badge" aria-hidden="true">
              {done ? <CheckIcon /> : i + 1}
            </span>
          );
          return (
            <li key={step.id} className={`stepper__item stepper__item--${status}`}>
              {reachable ? (
                <button type="button" className="stepper__step" onClick={() => dispatch(goToStep(step.id))}>
                  {badge}
                  <span className="stepper__title">{step.title}</span>
                  <span className="visually-hidden">{done ? ' (done)' : ''}</span>
                </button>
              ) : (
                <span
                  className="stepper__step"
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-disabled={isCurrent ? undefined : true}
                >
                  {badge}
                  <span className="stepper__title">{step.title}</span>
                  {!isCurrent && <span className="visually-hidden"> (not yet)</span>}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="stepper__compact">
        <p className="stepper__compact-text">
          Step {current + 1} of {total} — {WIZARD_STEPS[current].title}
        </p>
        <div
          className="stepper__bar"
          role="progressbar"
          aria-label="Progress"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={current + 1}
        >
          <div className="stepper__bar-fill" style={{ width: `${((current + 1) / total) * 100}%` }} />
        </div>
      </div>
    </nav>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" focusable="false">
      <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
