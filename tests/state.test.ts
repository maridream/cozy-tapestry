import { describe, expect, it } from 'vitest';
import {
  appReducer,
  back,
  canGoToStep,
  clearPhoto,
  goToStep,
  initialState,
  isStepComplete,
  next,
  setPhoto,
  type AppState,
} from '../src/app/state';
import { fitScale, MAX_PHOTO_SIDE } from '../src/steps/upload/loadPhoto';

// ImageData does not exist in the node test environment; the reducer only stores it by reference.
const fakeImage = { width: 4, height: 3, data: new Uint8ClampedArray(48) } as unknown as ImageData;

const withPhoto = (): AppState => appReducer(initialState, setPhoto(fakeImage, 'rex.jpg'));

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
    expect(appReducer(withPhoto(), next()).step).toBe('cutout');
  });

  it('next and back stay within bounds', () => {
    let s = withPhoto();
    for (let i = 0; i < 10; i++) s = appReducer(s, next());
    expect(s.step).toBe('pattern');
    for (let i = 0; i < 10; i++) s = appReducer(s, back());
    expect(s.step).toBe('upload');
  });

  it('goToStep refuses a step beyond the first incomplete one', () => {
    expect(appReducer(initialState, goToStep('cutout')).step).toBe('upload');
    expect(appReducer(initialState, goToStep('pattern')).step).toBe('upload');
    const s = appReducer(withPhoto(), goToStep('colors'));
    expect(s.step).toBe('colors');
    expect(appReducer(s, goToStep('upload')).step).toBe('upload');
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
