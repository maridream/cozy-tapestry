import { useEffect, useId, useState } from 'react';
import { editColor, resetColor, useApp } from '../../app/state';
import { hexToRgb, nameColor } from '../../engine/color';
import type { YarnColor } from '../../types';

/** One palette color: swatch (opens the color picker), editable name, share, Reset. */
export function ColorRow({ color, share, edited }: { color: YarnColor; share?: number; edited: boolean }) {
  const { dispatch } = useApp();
  const id = useId();
  // While a rebuild is pending, show what the user just picked rather than the old color.
  const [draftHex, setDraftHex] = useState<string | null>(null);
  useEffect(() => {
    if (draftHex && draftHex === color.hex) setDraftHex(null);
  }, [color.hex, draftHex]);
  const hex = draftHex ?? color.hex;

  const pickHex = (next: string) => {
    setDraftHex(next);
    // Keep an automatic name in step with the color unless the user typed one.
    const autoNamed = color.name.startsWith(nameColor(hexToRgb(color.hex))) || color.name.startsWith(nameColor(hexToRgb(color.autoHex)));
    dispatch(editColor({ ...color, hex: next, name: autoNamed ? nameColor(hexToRgb(next)) : color.name }));
  };

  const commitName = (value: string) => {
    const name = value.trim();
    if (name && name !== color.name) dispatch(editColor({ ...color, name }));
  };

  const isBg = color.role === 'background';
  if (color.role === 'decoration') {
    return (
      <li className="color-row">
        <span className="color-row__swatch color-row__swatch--fixed" style={{ backgroundColor: color.hex }} aria-hidden="true" />
        <div className="color-row__main">
          <span className="color-row__fixed-name">{color.name}</span>
          <div className="color-row__meta">
            <span className="color-row__tag">Pattern / text</span>
            {share !== undefined && <span>{Math.round(share * 100)}%</span>}
            <span>Change it on the Design step</span>
          </div>
        </div>
      </li>
    );
  }
  return (
    <li className="color-row">
      <label className="color-row__swatch" style={{ backgroundColor: hex }}>
        <input type="color" value={hex} onChange={(e) => pickHex(e.target.value)} aria-label={`Change color: ${color.name}`} />
      </label>
      <div className="color-row__main">
        <label className="visually-hidden" htmlFor={id}>
          Name for {isBg ? 'background' : 'color'}
        </label>
        <input
          id={id}
          key={color.name}
          className="color-row__name"
          defaultValue={color.name}
          onBlur={(e) => commitName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
        />
        <div className="color-row__meta">
          {isBg && <span className="color-row__tag">Background</span>}
          {share !== undefined && <span>{Math.round(share * 100)}%</span>}
          {edited && (
            <button type="button" className="color-row__reset" onClick={() => dispatch(resetColor(color))}>
              Reset
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
