import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import {
  COLOR_COUNT,
  DEFAULT_BACKGROUND_HEX,
  DEFAULT_YARDS_PER_SKEIN,
  DEFAULT_YARN_WEIGHT,
} from '../config/crochet';
import { WIZARD_STEPS } from '../config/steps';
import type { Pattern, PatternSettings, WizardStepId, YarnColor } from '../types';

// ----------------------------------------------------------------- state ---

export interface AppState {
  step: WizardStepId;
  photo: ImageData | null;
  photoName: string | null;
  /** Phase 2: model output, kept for "Reset". */
  autoMask: Uint8ClampedArray | null;
  /** Phase 2: after brush edits. */
  mask: Uint8ClampedArray | null;
  settings: PatternSettings;
  /** Phase 3: colors the user hand-edited. */
  lockedPalette: YarnColor[];
  /** Phase 3: last built pattern. */
  pattern: Pattern | null;
}

export const DEFAULT_SETTINGS: PatternSettings = {
  technique: 'blanket-sc',
  yarnWeight: DEFAULT_YARN_WEIGHT,
  size: { width: 24, height: 36 }, // the 2×3 ft preset, portrait
  framing: { zoom: 1, offsetX: 0, offsetY: 0 },
  filetShowDetails: true,
  colorCount: COLOR_COUNT.default,
  backgroundHex: DEFAULT_BACKGROUND_HEX,
  smoothing: 1,
  yardsPerSkein: DEFAULT_YARDS_PER_SKEIN[DEFAULT_YARN_WEIGHT],
};

export const initialState: AppState = {
  step: 'upload',
  photo: null,
  photoName: null,
  autoMask: null,
  mask: null,
  settings: DEFAULT_SETTINGS,
  lockedPalette: [],
  pattern: null,
};

// --------------------------------------------------------------- actions ---

export type AppAction =
  | { type: 'setPhoto'; image: ImageData; name: string }
  | { type: 'clearPhoto' }
  | { type: 'goToStep'; id: WizardStepId }
  | { type: 'next' }
  | { type: 'back' };

export const setPhoto = (image: ImageData, name: string): AppAction => ({ type: 'setPhoto', image, name });
export const clearPhoto = (): AppAction => ({ type: 'clearPhoto' });
export const goToStep = (id: WizardStepId): AppAction => ({ type: 'goToStep', id });
export const next = (): AppAction => ({ type: 'next' });
export const back = (): AppAction => ({ type: 'back' });

// ------------------------------------------------------------ step logic ---

export function stepIndex(id: WizardStepId): number {
  return WIZARD_STEPS.findIndex((s) => s.id === id);
}

/**
 * Whether a step's output exists, so the user may move past it.
 * Single source of truth for the stepper and the Next button.
 */
export function isStepComplete(state: AppState, stepId: WizardStepId): boolean {
  switch (stepId) {
    case 'upload':
      return state.photo !== null;
    // Phase 1 placeholders: complete once a photo exists.
    // Phase 2 makes 'cutout' require a mask; Phase 3 'setup'/'colors'; Phase 4 'pattern'.
    case 'cutout':
    case 'setup':
    case 'colors':
    case 'pattern':
      return state.photo !== null;
  }
}

/** Index of the furthest step the user may visit: the first incomplete one (or the last step). */
export function furthestReachableIndex(state: AppState): number {
  const firstIncomplete = WIZARD_STEPS.findIndex((s) => !isStepComplete(state, s.id));
  return firstIncomplete === -1 ? WIZARD_STEPS.length - 1 : firstIncomplete;
}

export function canGoToStep(state: AppState, id: WizardStepId): boolean {
  const i = stepIndex(id);
  return i >= 0 && i <= furthestReachableIndex(state);
}

/** Short reason shown beside a disabled Next button, or null when Next is allowed. */
export function nextBlockedReason(state: AppState, stepId: WizardStepId): string | null {
  if (isStepComplete(state, stepId)) return null;
  switch (stepId) {
    case 'upload':
      return 'Add a photo to continue';
    default:
      return 'Add a photo first';
  }
}

// --------------------------------------------------------------- reducer ---

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'setPhoto':
      return {
        ...state,
        photo: action.image,
        photoName: action.name,
        autoMask: null,
        mask: null,
        lockedPalette: [],
        pattern: null,
      };
    case 'clearPhoto':
      return {
        ...state,
        step: 'upload',
        photo: null,
        photoName: null,
        autoMask: null,
        mask: null,
        lockedPalette: [],
        pattern: null,
      };
    case 'goToStep':
      if (action.id === state.step || !canGoToStep(state, action.id)) return state;
      return { ...state, step: action.id };
    case 'next': {
      const i = stepIndex(state.step);
      if (i >= WIZARD_STEPS.length - 1 || !isStepComplete(state, state.step)) return state;
      return { ...state, step: WIZARD_STEPS[i + 1].id };
    }
    case 'back': {
      const i = stepIndex(state.step);
      if (i <= 0) return state;
      return { ...state, step: WIZARD_STEPS[i - 1].id };
    }
  }
}

// --------------------------------------------------------------- context ---

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
