import { useEffect, useRef, useState } from 'react';
import { resetAll, setYardsPerSkein, useApp } from '../../app/state';
import { Button } from '../../components/Button';
import { renderPreview } from '../../engine/renderPreview';
import { ESTIMATE_NOTE, patternFacts, pdfFileName, roundUp, yarnNotes } from '../../export/patternText';
import type { Paper } from '../../export/chartLayout';
import type { Pattern } from '../../types';
import { WrittenRows } from './WrittenRows';
import './PatternStep.css';

export function PatternStep() {
  const { state, dispatch } = useApp();
  const pattern = state.pattern;
  if (!pattern) return null; // the reducer moves us back to Colors if this ever happens

  return (
    <div className="pattern">
      <Summary pattern={pattern} />
      <YarnList pattern={pattern} onYardsPerSkein={(y) => dispatch(setYardsPerSkein(y))} />
      <WrittenRows pattern={pattern} />
      <Actions pattern={pattern} photoName={state.photoName} onMakeAnother={() => dispatch(resetAll())} />
    </div>
  );
}

function Summary({ pattern }: { pattern: Pattern }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const draw = () =>
      renderPreview(canvas, pattern.grid, pattern.gridSpec, pattern.settings.technique, {
        cssWidth: wrap.clientWidth,
        maxCssHeight: Math.min(480, window.innerHeight * 0.6),
      });
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [pattern]);

  return (
    <section className="pattern__section pattern__summary" aria-labelledby="pattern-summary">
      <h2 id="pattern-summary" className="visually-hidden">
        Summary
      </h2>
      <div className="pattern__preview" ref={wrapRef}>
        <canvas ref={canvasRef} role="img" aria-label="Your finished pattern" />
      </div>
      <div>
        <dl className="pattern__facts">
          {patternFacts(pattern).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="pattern__note">{ESTIMATE_NOTE}</p>
      </div>
    </section>
  );
}

function YarnList({ pattern, onYardsPerSkein }: { pattern: Pattern; onYardsPerSkein: (y: number) => void }) {
  const { estimate, grid } = pattern;
  const [draft, setDraft] = useState(String(estimate.yardsPerSkein));
  useEffect(() => setDraft(String(estimate.yardsPerSkein)), [estimate.yardsPerSkein]);
  const draftNum = Number(draft);
  const valid = Number.isFinite(draftNum) && draftNum >= 20 && draftNum <= 2000;
  const totalSkeins = estimate.lines.reduce((s, l) => s + l.skeins, 0);

  return (
    <section className="pattern__section" aria-labelledby="pattern-yarn">
      <h2 id="pattern-yarn" className="pattern__heading">
        Yarn shopping list
      </h2>
      <div className="pattern__skein">
        <label htmlFor="yards-per-skein">Yards per skein</label>
        <input
          id="yards-per-skein"
          type="number"
          inputMode="numeric"
          min={20}
          max={2000}
          value={draft}
          aria-invalid={!valid}
          aria-describedby="yards-per-skein-hint"
          onChange={(e) => {
            setDraft(e.target.value);
            const n = Number(e.target.value);
            if (Number.isFinite(n) && n >= 20 && n <= 2000) onYardsPerSkein(n);
          }}
        />
        <span id="yards-per-skein-hint" className={valid ? 'pattern__muted' : 'pattern__error'}>
          {valid ? 'Check the label on your yarn.' : 'Enter a number from 20 to 2000.'}
        </span>
      </div>
      <div className="pattern__table-wrap">
        <table className="pattern__table">
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">Swatch</span>
              </th>
              <th scope="col">Color</th>
              <th scope="col" className="num">
                Yards
              </th>
              <th scope="col" className="num">
                Meters
              </th>
              <th scope="col" className="num">
                Skeins
              </th>
            </tr>
          </thead>
          <tbody>
            {estimate.lines.map((l) => {
              const c = grid.palette[l.colorIndex];
              return (
                <tr key={l.colorIndex}>
                  <td>
                    <span className="pattern__swatch" style={{ backgroundColor: c.hex }} aria-hidden="true" />
                  </td>
                  <th scope="row">{c.name}</th>
                  <td className="num">{roundUp(l.yards).toLocaleString()}</td>
                  <td className="num">{roundUp(l.meters).toLocaleString()}</td>
                  <td className="num">{l.skeins}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td />
              <th scope="row">Total</th>
              <td className="num">{roundUp(estimate.totalYards).toLocaleString()}</td>
              <td className="num">{roundUp(estimate.totalMeters).toLocaleString()}</td>
              <td className="num">{totalSkeins}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {yarnNotes(pattern).map((n) => (
        <p key={n} className="pattern__note">
          {n}
        </p>
      ))}
    </section>
  );
}

type PdfState = { kind: 'idle' } | { kind: 'working'; progress: number } | { kind: 'done' } | { kind: 'error' };

function Actions({ pattern, photoName, onMakeAnother }: { pattern: Pattern; photoName: string | null; onMakeAnother: () => void }) {
  const [paper, setPaper] = useState<Paper>(() => (navigator.language && !/^en-(us|ca)|^es-(us|mx)/i.test(navigator.language) ? 'a4' : 'letter'));
  const [pdf, setPdf] = useState<PdfState>({ kind: 'idle' });

  const download = async () => {
    setPdf({ kind: 'working', progress: 0 });
    try {
      const [{ exportPatternPdf }, { renderPreviewToBlob }] = await Promise.all([import('../../export/pdf'), import('../../engine/renderPreview')]);
      const png = await renderPreviewToBlob(pattern.grid, pattern.gridSpec, pattern.settings.technique, 1200);
      const blob = await exportPatternPdf(pattern, png, {
        paper,
        title: photoName ?? undefined,
        onProgress: (f) => setPdf({ kind: 'working', progress: f }),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfFileName(pattern, photoName);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setPdf({ kind: 'done' });
    } catch (err) {
      console.error(err);
      setPdf({ kind: 'error' });
    }
  };

  return (
    <section className="pattern__section pattern__actions" aria-labelledby="pattern-actions">
      <h2 id="pattern-actions" className="pattern__heading">
        Take it with you
      </h2>
      <div className="pattern__action-row">
        <Button variant="primary" onClick={download} disabled={pdf.kind === 'working'}>
          {pdf.kind === 'working' ? 'Preparing your PDF…' : 'Download PDF'}
        </Button>
        <label className="pattern__paper">
          <span>Paper size</span>
          <select value={paper} onChange={(e) => setPaper(e.target.value as Paper)}>
            <option value="letter">US Letter</option>
            <option value="a4">A4</option>
          </select>
        </label>
      </div>
      <p className="pattern__muted" role="status" aria-live="polite">
        {pdf.kind === 'working' && `Drawing the pages… ${Math.round(pdf.progress * 100)}%`}
        {pdf.kind === 'done' && 'Your PDF is downloading. It has the chart, the yarn list and every row, ready to print.'}
        {pdf.kind === 'error' && (
          <span className="pattern__error">Something went wrong making the PDF. Please try again — or try the other paper size.</span>
        )}
      </p>
      <div className="pattern__another">
        <Button
          variant="quiet"
          onClick={() => {
            if (window.confirm('Start a new pattern? This one will be cleared — download the PDF first if you want to keep it.')) onMakeAnother();
          }}
        >
          Make another
        </Button>
      </div>
    </section>
  );
}
