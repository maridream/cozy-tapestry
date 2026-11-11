import { useEffect, type ComponentType } from 'react';
import { ColorsStep } from '../steps/colors/ColorsStep';
import { CutoutStep } from '../steps/cutout/CutoutStep';
import { PatternStep } from '../steps/pattern/PatternStep';
import { SetupStep } from '../steps/setup/SetupStep';
import { UploadStep } from '../steps/upload/UploadStep';
import type { WizardStepId } from '../types';
import { Header } from './Header';
import { AppProvider, useApp } from './state';
import { StepLayout } from './StepLayout';
import { Stepper } from './Stepper';
import './App.css';

export const REPO_URL = 'https://github.com/maridream/cozy-tapestry';

/** Which screen each wizard step shows. Later phases replace the placeholders. */
const STEP_SCREENS: Record<WizardStepId, ComponentType> = {
  upload: UploadStep,
  cutout: CutoutStep,
  setup: SetupStep,
  colors: ColorsStep,
  pattern: PatternStep,
};

export function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

function Shell() {
  const { state } = useApp();
  const Screen = STEP_SCREENS[state.step];
  const hasWork = state.photo !== null;

  // Nothing is saved, so warn before leaving once there is work to lose.
  useEffect(() => {
    if (!hasWork) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasWork]);
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <Stepper />
      <main id="main" className="app__main">
        <StepLayout>
          <Screen key={state.step} />
        </StepLayout>
      </main>
      <footer className="app__footer">
        <p>Your photo stays on your device.</p>
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          Source code on GitHub
        </a>
      </footer>
    </div>
  );
}
