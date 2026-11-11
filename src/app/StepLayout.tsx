import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { WIZARD_STEPS } from '../config/steps';
import { back, next, nextBlockedReason, stepIndex, useApp } from './state';
import './StepLayout.css';

/** The step card: heading, helper sentence, content, and the Back / Next footer. */
export function StepLayout({ children }: { children: ReactNode }) {
  const { state, dispatch } = useApp();
  const index = stepIndex(state.step);
  const info = WIZARD_STEPS[index];
  const isFirst = index === 0;
  const isLast = index === WIZARD_STEPS.length - 1;
  const blocked = nextBlockedReason(state, state.step);

  // Move focus to the new heading when the step changes (not on first load).
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [state.step]);

  return (
    <Card className="step-card" aria-labelledby="step-heading">
      <h1 id="step-heading" className="step-card__heading" tabIndex={-1} ref={headingRef}>
        {info.title}
      </h1>
      <p className="step-card__summary">{info.summary}</p>

      <div className="step-card__body">{children}</div>

      <div className="step-card__footer">
        {!isFirst ? (
          <Button variant="secondary" onClick={() => dispatch(back())}>
            <span aria-hidden="true">←</span> Back
          </Button>
        ) : (
          <span />
        )}
        {!isLast && (
          <div className="step-card__next">
            {blocked && (
              <p className="step-card__reason" id="next-reason">
                {blocked}
              </p>
            )}
            <Button
              variant="primary"
              disabled={blocked !== null}
              aria-describedby={blocked ? 'next-reason' : undefined}
              onClick={() => dispatch(next())}
            >
              Next <span aria-hidden="true">→</span>
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
