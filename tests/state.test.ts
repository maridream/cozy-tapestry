import { describe, expect, it } from 'vitest';
import {
  appReducer,
  back,
  canGoToStep,
  clearPhoto,
  getCutout,
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
