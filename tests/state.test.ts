import { describe, expect, it } from 'vitest';
import {
  appReducer,
  back,
  canGoToStep,
  clearPhoto,
  editColor,
  getCutout,
  patternInputs,
  resetAll,
  resetColor,
  setFraming,
  setPattern,
  setYardsPerSkein,
  updateSettings,
  goToStep,
  initialState,
  isStepComplete,
  next,
  resetMask,
  setAutoMask,
  setMask,
  setPhoto,
  type AppState,
} from '../src/app/state';
import { fitScale, MAX_PHOTO_SIDE } from '../src/steps/upload/loadPhoto';

// ImageData does not exist in the node test environment; the reducer only stores it by reference.
const fakeImage = { width: 4, height: 3, data: new Uint8ClampedArray(48) } as unknown as ImageData;

const withPhoto = (): AppState => appReducer(initialState, setPhoto(fakeImage, 'rex.jpg'));
/** A 4×3 mask with `on` pixels set. */
const maskWith = (on: number) => {
  const m = new Uint8ClampedArray(12);
  m.fill(255, 0, on);
  return m;
};
const withCutout = (): AppState => appReducer(withPhoto(), setAutoMask(maskWith(6), fakeImage));

describe('app reducer', () => {
  it('starts on the upload step with nothing complete', () => {
    expect(initialState.step).toBe('upload');
    expect(isStepComplete(initialState, 'upload')).toBe(false);
    expect(canGoToStep(initialState, 'cutout')).toBe(false);
  });

  it('setPhoto completes the upload step and unlocks step 2', () => {
    const s = withPhoto();
    expect(s.photo).toBe(fakeImage); // stored by reference, not copied
    expect(s.photoName).toBe('rex.jpg');
    expect(isStepComplete(s, 'upload')).toBe(true);
    expect(canGoToStep(s, 'cutout')).toBe(true);
  });

  it('setPhoto and clearPhoto clear everything downstream', () => {
    const dirty: AppState = {
      ...withPhoto(),
      autoMask: new Uint8ClampedArray(12),
      mask: new Uint8ClampedArray(12),
      lockedPalette: [{ id: 'c0', name: 'cream', hex: '#ffffff', role: 'background', userEdited: true, autoHex: '#fefefe' }],
      pattern: {} as AppState['pattern'],
    };
    for (const s of [appReducer(dirty, setPhoto(fakeImage, 'new.png')), appReducer(dirty, clearPhoto())]) {
      expect(s.autoMask).toBeNull();
      expect(s.mask).toBeNull();
      expect(s.lockedPalette).toEqual([]);
      expect(s.pattern).toBeNull();
    }
    const cleared = appReducer({ ...dirty, step: 'colors' }, clearPhoto());
    expect(cleared.photo).toBeNull();
    expect(cleared.step).toBe('upload');
  });

  it('next is blocked until the current step is complete', () => {
    expect(appReducer(initialState, next()).step).toBe('upload');
    const onCutout = appReducer(withPhoto(), next());
    expect(onCutout.step).toBe('cutout');
    expect(appReducer(onCutout, next()).step).toBe('cutout'); // no mask yet
  });

  it('next and back stay within bounds', () => {
    let s = withCutout();
    for (let i = 0; i < 10; i++) s = appReducer(s, next());
    expect(s.step).toBe('colors'); // needs a pattern to go further
    s = { ...s, pattern: {} as AppState['pattern'] };
    for (let i = 0; i < 10; i++) s = appReducer(s, next());
    expect(s.step).toBe('pattern');
    for (let i = 0; i < 10; i++) s = appReducer(s, back());
    expect(s.step).toBe('upload');
  });

  it('goToStep refuses a step beyond the first incomplete one', () => {
    expect(appReducer(initialState, goToStep('cutout')).step).toBe('upload');
    expect(appReducer(initialState, goToStep('pattern')).step).toBe('upload');
    expect(appReducer(withPhoto(), goToStep('colors')).step).toBe('upload'); // cutout not done yet
    expect(appReducer(withPhoto(), goToStep('cutout')).step).toBe('cutout');
    const s = appReducer(withCutout(), goToStep('colors'));
    expect(s.step).toBe('colors');
    expect(appReducer(s, goToStep('upload')).step).toBe('upload');
  });
});

describe('cutout state', () => {
  it('setAutoMask stores the mask and starts editing from a copy', () => {
    const auto = maskWith(6);
    const s = appReducer(withPhoto(), setAutoMask(auto, fakeImage));
    expect(s.autoMask).toBe(auto);
    expect(s.mask).not.toBe(auto);
    expect(Array.from(s.mask!)).toEqual(Array.from(auto));
    expect(getCutout(s)).toEqual({ image: fakeImage, mask: s.mask });
  });

  it('ignores an automatic cutout for a photo that has since changed', () => {
    const otherPhoto = { width: 4, height: 3, data: new Uint8ClampedArray(48) } as unknown as ImageData;
    const s = appReducer(withPhoto(), setAutoMask(maskWith(6), otherPhoto));
    expect(s.autoMask).toBeNull();
    expect(getCutout(s)).toBeNull();
  });

  it('setMask clears the pattern; resetMask restores the automatic cutout', () => {
    const edited = maskWith(12);
    const s = appReducer({ ...withCutout(), pattern: {} as AppState['pattern'] }, setMask(edited));
    expect(s.mask).toBe(edited);
    expect(s.pattern).toBeNull();
    const r = appReducer(s, resetMask());
    expect(Array.from(r.mask!)).toEqual(Array.from(maskWith(6)));
    expect(r.mask).not.toBe(r.autoMask);
  });

  it('the cutout step needs at least 1% of pixels marked as pet', () => {
    const big = { width: 100, height: 100, data: new Uint8ClampedArray(40000) } as unknown as ImageData;
    const base = appReducer(initialState, setPhoto(big, 'big.jpg'));
    const tiny = new Uint8ClampedArray(10000).fill(255, 0, 99); // 0.99%
    const enough = new Uint8ClampedArray(10000).fill(255, 0, 100); // 1%
    expect(isStepComplete(appReducer(base, setAutoMask(tiny, big)), 'cutout')).toBe(false);
    expect(isStepComplete(appReducer(base, setAutoMask(enough, big)), 'cutout')).toBe(true);
    expect(isStepComplete(base, 'cutout')).toBe(false);
  });
});

describe('photo downscaling', () => {
  it('never upscales and caps the longest side', () => {
    expect(fitScale(800, 600)).toBe(1);
    expect(fitScale(MAX_PHOTO_SIDE, 10)).toBe(1);
    expect(fitScale(4096, 3072)).toBeCloseTo(0.5);
    expect(Math.round(3000 * fitScale(3000, 4000))).toBe(1536);
  });
});

describe('pattern settings state', () => {
  const pattern = {} as NonNullable<AppState['pattern']>;
  const subjectColor = { id: 'c1', name: 'brown', hex: '#8b5a2b', role: 'subject' as const, userEdited: false, autoHex: '#8b5a2b' };
  const bgColor = { id: 'c0', name: 'cream', hex: '#f3e9d8', role: 'background' as const, userEdited: false, autoHex: '#f3e9d8' };

  it('any settings change clears the pattern', () => {
    const s = { ...withCutout(), pattern };
    expect(appReducer(s, updateSettings({ smoothing: 2 })).pattern).toBeNull();
    expect(appReducer(s, setFraming({ zoom: 1.5, offsetX: 0, offsetY: 0 })).pattern).toBeNull();
    expect(appReducer(s, editColor({ ...subjectColor, hex: '#000000' })).pattern).toBeNull();
  });

  it('changing yarn weight resets yards per skein', () => {
    const s = appReducer(withCutout(), updateSettings({ yarnWeight: 'bulky' }));
    expect(s.settings.yardsPerSkein).toBe(120);
  });

  it('setup needs a valid size', () => {
    expect(isStepComplete(withCutout(), 'setup')).toBe(true);
    expect(isStepComplete(appReducer(withCutout(), updateSettings({ size: { width: 6, height: 36 } })), 'setup')).toBe(false);
  });

  it('pet color edits are kept by a Detail change and cleared by a color-count change', () => {
    let s = appReducer(withCutout(), editColor({ ...subjectColor, hex: '#ff0000', name: 'red yarn' }));
    expect(s.lockedPalette).toHaveLength(1);
    expect(appReducer(s, updateSettings({ smoothing: 0 })).lockedPalette).toHaveLength(1);
    expect(appReducer(s, updateSettings({ colorCount: 6 })).lockedPalette).toHaveLength(0);
    s = appReducer(s, resetColor(subjectColor));
    expect(s.lockedPalette).toHaveLength(0);
  });

  it('editing the background sets backgroundHex; reset restores the default', () => {
    const s = appReducer(withCutout(), editColor({ ...bgColor, hex: '#223344' }));
    expect(s.settings.backgroundHex).toBe('#223344');
    expect(appReducer(s, resetColor(bgColor)).settings.backgroundHex).toBe(initialState.settings.backgroundHex);
  });

  it('setPattern ignores a build for inputs that have changed since', () => {
    const s = withCutout();
    const from = patternInputs(s);
    expect(appReducer(s, setPattern(pattern, from)).pattern).toBe(pattern);
    const changed = appReducer(s, updateSettings({ smoothing: 0 }));
    expect(appReducer(changed, setPattern(pattern, from)).pattern).toBeNull();
    expect(isStepComplete(appReducer(s, setPattern(pattern, from)), 'colors')).toBe(true);
  });
});

describe('pattern step state', () => {
  it('yards per skein updates skeins without clearing the pattern', async () => {
    const { buildPattern } = await import('../src/engine/buildPattern');
    const { makeCutout } = await import('./helpers');
    const cut = makeCutout(60, 60, (x) => [120, 80, 40, x > 10 && x < 50 ? 255 : 0]);
    let s: AppState = { ...appReducer(initialState, setPhoto(cut.image, 'p.png')), mask: cut.mask, step: 'pattern' as const };
    s = { ...s, pattern: buildPattern(cut, s.settings) };
    const before = s.pattern!.estimate.lines.map((l) => l.skeins);
    const after = appReducer(s, setYardsPerSkein(50));
    expect(after.pattern).not.toBeNull();
    expect(after.step).toBe('pattern');
    expect(after.settings.yardsPerSkein).toBe(50);
    after.pattern!.estimate.lines.forEach((l, i) => {
      expect(l.skeins).toBe(Math.ceil(l.yards / 50));
      expect(l.skeins).toBeGreaterThanOrEqual(before[i]);
    });
  });

  it('resetAll returns to a clean step 1', () => {
    const s = appReducer({ ...withCutout(), step: 'colors' }, resetAll());
    expect(s).toEqual(initialState);
  });

  it('never stays on a step whose inputs are missing', () => {
    const onPattern: AppState = { ...withCutout(), step: 'pattern', pattern: {} as AppState['pattern'] };
    // a settings change clears the pattern -> back to Colors, where it is rebuilt
    expect(appReducer(onPattern, updateSettings({ smoothing: 0 })).step).toBe('colors');
  });
});
