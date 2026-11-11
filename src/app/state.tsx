import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import {
  COLOR_COUNT,
  DEFAULT_BACKGROUND_HEX,
  DEFAULT_YARDS_PER_SKEIN,
  DEFAULT_YARN_WEIGHT,
} from '../config/crochet';
import { WIZARD_STEPS } from '../config/steps';
import { subjectBounds } from '../engine/buildGrid';
import { validateSize } from '../engine/sizing';
import { hasMeaningfulSubject } from '../segmentation/mask';
import type { BackgroundPattern, CutoutImage, Framing, Pattern, PatternSettings, TextLayer, WizardStepId, YarnColor } from '../types';

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
  background: { motif: 'none', colorHex: '#b8c4a8', sizeIn: 4, direction: 'across' },
  texts: [],
};

/** Most text layers allowed on one piece. */
export const MAX_TEXTS = 3;

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
  | { type: 'back' }
  | { type: 'setAutoMask'; mask: Uint8ClampedArray; forPhoto?: ImageData }
  | { type: 'setMask'; mask: Uint8ClampedArray }
  | { type: 'resetMask' }
  | { type: 'updateSettings'; partial: Partial<PatternSettings> }
  | { type: 'setFraming'; framing: Framing }
  | { type: 'editColor'; color: YarnColor }
  | { type: 'resetColor'; color: YarnColor }
  | { type: 'setPattern'; pattern: Pattern; from: PatternInputs }
  | { type: 'setYardsPerSkein'; yards: number }
  | { type: 'setBackground'; partial: Partial<BackgroundPattern> }
  | { type: 'addText'; layer: TextLayer }
  | { type: 'updateText'; id: string; partial: Partial<TextLayer> }
  | { type: 'removeText'; id: string }
  | { type: 'resetAll' };

/** What a pattern was built from; a result for older inputs is ignored. */
export interface PatternInputs {
  mask: Uint8ClampedArray | null;
  settings: PatternSettings;
  lockedPalette: YarnColor[];
}

export const setPhoto = (image: ImageData, name: string): AppAction => ({ type: 'setPhoto', image, name });
export const clearPhoto = (): AppAction => ({ type: 'clearPhoto' });
export const goToStep = (id: WizardStepId): AppAction => ({ type: 'goToStep', id });
export const next = (): AppAction => ({ type: 'next' });
export const back = (): AppAction => ({ type: 'back' });
/**
 * Stores the automatic cutout (and starts editing from a copy of it).
 * Pass the photo it was made from; the result is ignored if the photo has changed since.
 */
export const setAutoMask = (mask: Uint8ClampedArray, forPhoto?: ImageData): AppAction => ({ type: 'setAutoMask', mask, forPhoto });
/** Commits an edited mask. The array must not be mutated afterwards. */
export const setMask = (mask: Uint8ClampedArray): AppAction => ({ type: 'setMask', mask });
/** Puts the automatic cutout back. */
export const resetMask = (): AppAction => ({ type: 'resetMask' });
/**
 * Changes pattern settings. Changing the yarn weight resets yards per skein to that
 * weight's default; changing the number of colors (or switching to/from filet)
 * drops hand-edited pet colors.
 */
export const updateSettings = (partial: Partial<PatternSettings>): AppAction => ({ type: 'updateSettings', partial });
export const setFraming = (framing: Framing): AppAction => ({ type: 'setFraming', framing });
/** Stores a hand-edited color (pet colors go to lockedPalette; the background also sets backgroundHex). */
export const editColor = (color: YarnColor): AppAction => ({ type: 'editColor', color });
/** Puts a color back to the automatic pick. Takes the palette entry (matched by role + autoHex). */
export const resetColor = (color: YarnColor): AppAction => ({ type: 'resetColor', color });
/** Stores a built pattern, but only if the inputs it was built from are still current. */
export const setPattern = (pattern: Pattern, from: PatternInputs): AppAction => ({ type: 'setPattern', pattern, from });

/** Changes skein size and updates skein counts in place (no rebuild needed). */
export const setYardsPerSkein = (yards: number): AppAction => ({ type: 'setYardsPerSkein', yards });
export const setBackground = (partial: Partial<BackgroundPattern>): AppAction => ({ type: 'setBackground', partial });
export const addText = (layer: TextLayer): AppAction => ({ type: 'addText', layer });
export const updateText = (id: string, partial: Partial<TextLayer>): AppAction => ({ type: 'updateText', id, partial });
export const removeText = (id: string): AppAction => ({ type: 'removeText', id });

/** "Make another": back to a clean step 1. */
export const resetAll = (): AppAction => ({ type: 'resetAll' });

/** The inputs the next pattern build should use. */
export function patternInputs(state: AppState): PatternInputs {
  return { mask: state.mask, settings: state.settings, lockedPalette: state.lockedPalette };
}

/** Whether a color in the current pattern was edited by hand (shows "Reset"). */
export function isColorEdited(state: AppState, color: YarnColor): boolean {
  if (color.role === 'background') return state.settings.backgroundHex !== DEFAULT_BACKGROUND_HEX || state.lockedPalette.some((c) => c.role === 'background');
  return color.userEdited;
}

// ------------------------------------------------------------- selectors ---

/** The photo plus its edited mask, for the pattern engine (Phase 3). */
export function getCutout(state: AppState): CutoutImage | null {
  return state.photo && state.mask ? { image: state.photo, mask: state.mask } : null;
}

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
    case 'cutout':
      return state.photo !== null && hasMeaningfulSubject(state.mask);
    case 'setup':
    case 'design':
      return validateSize(state.settings.size).ok;
    case 'colors':
      return state.pattern !== null;
    case 'pattern':
      return state.pattern !== null;
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
    case 'cutout':
      return state.mask === null ? 'Finding your pet…' : 'Paint over your pet with Keep to continue.';
    case 'setup': {
      const check = validateSize(state.settings.size);
      return check.ok ? null : 'Choose a size that fits to continue';
    }
    case 'colors':
      return 'Making your pattern…';
    default:
      return 'Add a photo first';
  }
}

// --------------------------------------------------------------- reducer ---

export function appReducer(state: AppState, action: AppAction): AppState {
  const result = reduce(state, action);
  // Never sit on a step whose inputs are missing: fall back to the earliest incomplete one.
  const furthest = furthestReachableIndex(result);
  return stepIndex(result.step) > furthest ? { ...result, step: WIZARD_STEPS[furthest].id } : result;
}

function reduce(state: AppState, action: AppAction): AppState {
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
    case 'setAutoMask':
      if (action.forPhoto && action.forPhoto !== state.photo) return state; // stale result for an old photo
      return {
        ...state,
        autoMask: action.mask,
        mask: action.mask.slice(),
        settings: orientToSubject(state.settings, action.mask, state.photo),
        pattern: null,
      };
    case 'setMask':
      return { ...state, mask: action.mask, pattern: null };
    case 'resetMask':
      if (!state.autoMask) return state;
      return { ...state, mask: state.autoMask.slice(), pattern: null };
    case 'updateSettings': {
      const prev = state.settings;
      const settings = { ...prev, ...action.partial };
      if (action.partial.yarnWeight && action.partial.yarnWeight !== prev.yarnWeight && action.partial.yardsPerSkein === undefined) {
        settings.yardsPerSkein = DEFAULT_YARDS_PER_SKEIN[settings.yarnWeight];
      }
      const filetSwitched = (prev.technique === 'decor-filet') !== (settings.technique === 'decor-filet');
      const lockedPalette =
        settings.colorCount !== prev.colorCount || filetSwitched ? state.lockedPalette.filter((c) => c.role === 'background') : state.lockedPalette;
      return { ...state, settings, lockedPalette, pattern: null };
    }
    case 'setFraming':
      return { ...state, settings: { ...state.settings, framing: action.framing }, pattern: null };
    case 'editColor': {
      const c = { ...action.color, userEdited: true };
      if (c.role === 'background') {
        return {
          ...state,
          settings: { ...state.settings, backgroundHex: c.hex },
          lockedPalette: [...state.lockedPalette.filter((l) => l.role !== 'background'), c],
          pattern: null,
        };
      }
      return {
        ...state,
        lockedPalette: [...state.lockedPalette.filter((l) => !(l.role === 'subject' && l.autoHex === c.autoHex)), c],
        pattern: null,
      };
    }
    case 'resetColor': {
      const c = action.color;
      if (c.role === 'background') {
        return {
          ...state,
          settings: { ...state.settings, backgroundHex: DEFAULT_BACKGROUND_HEX },
          lockedPalette: state.lockedPalette.filter((l) => l.role !== 'background'),
          pattern: null,
        };
      }
      return { ...state, lockedPalette: state.lockedPalette.filter((l) => !(l.role === 'subject' && l.autoHex === c.autoHex)), pattern: null };
    }
    case 'setPattern': {
      const f = action.from;
      if (f.mask !== state.mask || f.settings !== state.settings || f.lockedPalette !== state.lockedPalette) return state; // stale build
      return { ...state, pattern: action.pattern };
    }
    case 'setYardsPerSkein': {
      const yards = Math.max(1, action.yards);
      const settings = { ...state.settings, yardsPerSkein: yards };
      const p = state.pattern;
      const pattern = p && {
        ...p,
        settings,
        estimate: { ...p.estimate, yardsPerSkein: yards, lines: p.estimate.lines.map((l) => ({ ...l, skeins: Math.ceil(l.yards / yards - 1e-9) })) },
      };
      return { ...state, settings, pattern };
    }
    case 'setBackground':
      return { ...state, settings: { ...state.settings, background: { ...state.settings.background, ...action.partial } }, pattern: null };
    case 'addText':
      if (state.settings.texts.length >= MAX_TEXTS) return state;
      return { ...state, settings: { ...state.settings, texts: [...state.settings.texts, action.layer] }, pattern: null };
    case 'updateText':
      return {
        ...state,
        settings: { ...state.settings, texts: state.settings.texts.map((t) => (t.id === action.id ? { ...t, ...action.partial } : t)) },
        pattern: null,
      };
    case 'removeText':
      return { ...state, settings: { ...state.settings, texts: state.settings.texts.filter((t) => t.id !== action.id) }, pattern: null };
    case 'resetAll':
      return initialState;
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

/** Portrait for a pet taller than wide, landscape otherwise (square sizes are left alone). */
function orientToSubject(settings: PatternSettings, mask: Uint8ClampedArray, photo: ImageData | null): PatternSettings {
  const { width, height } = settings.size;
  if (!photo || width === height) return settings;
  const b = subjectBounds(mask, photo.width, photo.height);
  const tall = b.y1 - b.y0 >= b.x1 - b.x0;
  const portrait = height > width;
  if (tall === portrait) return settings;
  return { ...settings, size: { width: height, height: width } };
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
