/** Tiny drawings of each fabric's character. Decorative. */
export function FabricSwatch({ kind }: { kind: 'sc' | 'dc' | 'filet' }) {
  const cells = [];
  if (kind === 'sc') {
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) cells.push(<rect key={`${r}-${c}`} x={2 + c * 7.5} y={2 + r * 7.5} width="6.5" height="6.5" rx="2" />);
  } else if (kind === 'dc') {
    for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) cells.push(<rect key={`${r}-${c}`} x={2 + c * 6.4} y={2 + r * 15} width="5" height="13.5" rx="2" />);
  } else {
    const filled = new Set(['1-1', '1-2', '2-1', '2-2', '0-3', '3-0']);
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        const x = 2 + c * 11;
        const y = 2 + r * 11;
        cells.push(
          filled.has(`${r}-${c}`) ? (
            <rect key={`${r}-${c}`} x={x} y={y} width="10" height="10" rx="1.5" />
          ) : (
            <rect key={`${r}-${c}`} x={x + 1} y={y + 1} width="8" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
          ),
        );
      }
  }
  return (
    <svg className="fabric-swatch" viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" focusable="false" fill="currentColor">
      {cells}
    </svg>
  );
}
