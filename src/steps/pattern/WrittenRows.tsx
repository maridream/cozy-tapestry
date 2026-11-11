import { Fragment, useMemo, useState } from 'react';
import { Button } from '../../components/Button';
import { howToRead } from '../../export/patternText';
import type { Pattern, WrittenRow } from '../../types';

const CHUNK = 50;

/** "Row by row": the written instructions, 50 rows at a time, with jump-to and copy. */
export function WrittenRows({ pattern }: { pattern: Pattern }) {
  const { rows, grid, settings } = pattern;
  const [shown, setShown] = useState(Math.min(CHUNK, rows.length));
  const [jump, setJump] = useState('');
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const filet = settings.technique === 'decor-filet';
  const plain = useMemo(() => rows.map((r) => r.text).join('\n'), [rows]);

  const goTo = () => {
    const n = Math.round(Number(jump));
    if (!Number.isFinite(n) || n < 1 || n > rows.length) return;
    if (n > shown) setShown(Math.min(rows.length, Math.ceil(n / CHUNK) * CHUNK));
    // After React has rendered the extra rows.
    setTimeout(() => {
      const el = document.getElementById(`row-${n}`);
      el?.scrollIntoView({ block: 'center' });
      el?.focus();
    }, 0);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plain);
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
    setTimeout(() => setCopied('idle'), 4000);
  };

  return (
    <section className="pattern__section" aria-labelledby="pattern-rows">
      <h2 id="pattern-rows" className="pattern__heading">
        Row by row
      </h2>
      <div className="pattern__howto">
        <h3>How to read this</h3>
        {howToRead(pattern).map((t) => (
          <p key={t}>{t}</p>
        ))}
      </div>

      <div className="rows__tools">
        <form
          className="rows__jump"
          onSubmit={(e) => {
            e.preventDefault();
            goTo();
          }}
        >
          <label htmlFor="jump-row">Jump to row</label>
          <input id="jump-row" type="number" inputMode="numeric" min={1} max={rows.length} value={jump} onChange={(e) => setJump(e.target.value)} />
          <Button type="submit" variant="secondary">
            Go
          </Button>
        </form>
        <Button variant="secondary" onClick={copy}>
          Copy all rows
        </Button>
        <span className="pattern__muted" role="status">
          {copied === 'ok' && `Copied ${rows.length} rows.`}
          {copied === 'fail' && "Couldn't copy — your browser blocked it."}
        </span>
      </div>

      <ol className="rows__list">
        {rows.slice(0, shown).map((row) => (
          <li key={row.rowNumber} id={`row-${row.rowNumber}`} tabIndex={-1} className={`rows__row rows__row--${row.side.toLowerCase()}`}>
            <RowText row={row} palette={grid.palette} filet={filet} />
          </li>
        ))}
      </ol>
      {shown < rows.length && (
        <div className="rows__more">
          <Button variant="secondary" onClick={() => setShown((s) => Math.min(rows.length, s + CHUNK))}>
            Show more rows
          </Button>
          <span className="pattern__muted">
            Showing rows 1–{shown} of {rows.length}
          </span>
        </div>
      )}
    </section>
  );
}

/** The row text with a small color dot before each color name. Same words as row.text. */
function RowText({ row, palette, filet }: { row: WrittenRow; palette: Pattern['grid']['palette']; filet: boolean }) {
  return (
    <>
      <strong>
        Row {row.rowNumber} ({row.side}):
      </strong>{' '}
      {row.runs.map((run, i) => (
        <Fragment key={i}>
          {i > 0 && ', '}
          <span className="rows__run">
            {run.count} {run.stitch}
            {!filet && (
              <>
                {' '}
                <span className="rows__dot" style={{ backgroundColor: palette[run.colorIndex]?.hex }} aria-hidden="true" />
                {palette[run.colorIndex]?.name}
              </>
            )}
          </span>
        </Fragment>
      ))}
    </>
  );
}
