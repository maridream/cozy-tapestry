import { describe, expect, it } from 'vitest';
import { hexToRgb, nameColor, rgbToHex, rgbToLab, uniqueNames } from '../src/engine/color';

describe('color conversion', () => {
  it('round-trips hex', () => {
    for (const hex of ['#000000', '#ffffff', '#8b5a2b', '#f3e9d8', '#0a7bcd']) expect(rgbToHex(hexToRgb(hex))).toBe(hex);
    expect(rgbToHex(hexToRgb('#ABCDEF'))).toBe('#abcdef');
  });
  it('white is L 100, a 0, b 0', () => {
    const lab = rgbToLab({ r: 255, g: 255, b: 255 });
    expect(lab.l).toBeCloseTo(100, 1);
    expect(lab.a).toBeCloseTo(0, 1);
    expect(lab.b).toBeCloseTo(0, 1);
  });
});

describe('nameColor', () => {
  const name = (hex: string) => nameColor(hexToRgb(hex));
  it('names the required cases', () => {
    expect(name('#ffffff')).toBe('white');
    expect(name('#000000')).toBe('black');
    expect(name('#808080')).toContain('grey');
    expect(name('#8b5a2b')).toContain('brown');
    expect(name('#f3e9d8')).toBe('cream');
    expect(name('#d62828')).toContain('red');
  });
  it('calls muted warm mid-tones tan, not yellow', () => {
    expect(name('#b29763')).toBe('tan'); // a dog's tan markings
    expect(name('#e0c040')).toContain('yellow');
  });
  it('uses one or two words', () => {
    for (const hex of ['#123456', '#ff8800', '#00aa55', '#aa00aa', '#ffc0cb', '#e0c040', '#444444', '#c8b496']) {
      expect(name(hex).split(' ').length).toBeLessThanOrEqual(2);
    }
  });
});

describe('uniqueNames', () => {
  it('splits a pair by lightness', () => {
    expect(uniqueNames(['grey', 'grey', 'cream'], [70, 40, 92])).toEqual(['light grey', 'dark grey', 'cream']);
  });
  it('numbers larger groups or when lightness is unknown', () => {
    expect(uniqueNames(['grey', 'grey', 'grey'], [70, 50, 30])).toEqual(['grey', 'grey 2', 'grey 3']);
    expect(uniqueNames(['tan', 'tan'])).toEqual(['tan', 'tan 2']);
  });
  it('never returns duplicates', () => {
    const out = uniqueNames(['light grey', 'grey', 'grey'], [80, 60, 40]);
    expect(new Set(out).size).toBe(3);
  });
});
