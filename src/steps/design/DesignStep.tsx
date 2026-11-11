import { useEffect, useId, useMemo, useState } from 'react';
import { addText, MAX_TEXTS, removeText, setBackground, setFraming, updateSettings, updateText, useApp } from '../../app/state';
import { usePatternBuild } from '../../app/usePatternBuild';
import { Button } from '../../components/Button';
import { Segmented } from '../../components/Segmented';
import { Slider } from '../../components/Slider';
import { MOTIFS } from '../../engine/motifs';
import { computeGridSpec, getGauge } from '../../engine/sizing';
import type { GridSpec, MotifDirection, TextFont, TextLayer } from '../../types';
import { DesignCanvas, type Selection } from './DesignCanvas';
import { MotifSwatch } from './MotifSwatch';
import { TEXT_FONTS, textBlock } from './textBlocks';
import './DesignStep.css';

const DIRECTIONS: { value: MotifDirection; label: string }[] = [
  { value: 'across', label: 'Across' },
  { value: 'down', label: 'Up & down' },
  { value: 'diagonal', label: 'Diagonal ↘' },
  { value: 'diagonal-reverse', label: 'Diagonal ↗' },
];

export function DesignStep() {
  const { state, dispatch } = useApp();
  const { settings } = state;
  const { shown, updating } = usePatternBuild(60);
  const [selected, setSelected] = useState<Selection>('pet');
  const gridSpec = useMemo(() => computeGridSpec(settings.size, getGauge(settings.technique, settings.yarnWeight)), [settings.size, settings.technique, settings.yarnWeight]);
  const filet = settings.technique === 'decor-filet';

  // If the selected text is removed, go back to the pet.
  useEffect(() => {
    if (selected !== 'pet' && !settings.texts.some((t) => t.id === selected)) setSelected('pet');
  }, [selected, settings.texts]);

  const add = () => {
    const id = `t${Date.now().toString(36)}`;
    const minSize = Math.ceil((8 / gridSpec.rows) * gridSpec.finished.height * 2) / 2; // at least ~8 rows tall
    dispatch(
      addText({
        id,
        text: 'Best friend',
        font: 'stitch',
        sizeIn: Math.max(2, Math.min(12, minSize)),
        colorHex: '#3b2f25',
        x: 0.5,
        y: settings.texts.length === 0 ? 0.9 : settings.texts.length === 1 ? 0.1 : 0.5,
      }),
    );
    setSelected(id);
  };

  const moveTargets = [{ value: 'pet', label: 'Pet' }, ...settings.texts.map((t, i) => ({ value: t.id, label: `Text ${i + 1}` }))];

  return (
    <div className="design">
      <div className="design__preview">
        <DesignCanvas pattern={shown} gridSpec={gridSpec} selected={selected} onSelect={setSelected} />
        <p className={`design__status ${updating ? 'is-updating' : ''}`} aria-live="polite">
          {updating ? 'Updating…' : <span className="visually-hidden">Preview updated.</span>}
        </p>
        <div className="design__move">
          {moveTargets.length > 1 && (
            <Segmented<string> legend="Move" name="design-move" value={selected} onChange={(v) => setSelected(v)} options={moveTargets} />
          )}
          <MovePad
            label={selected === 'pet' ? 'your pet' : 'the text'}
            onMove={(dx, dy) => {
              if (selected === 'pet') {
                const f = settings.framing;
                dispatch(setFraming({ ...f, offsetX: clamp(f.offsetX + dx, -0.75, 0.75), offsetY: clamp(f.offsetY + dy, -0.75, 0.75) }));
              } else {
                const t = settings.texts.find((x) => x.id === selected);
                if (t) dispatch(updateText(t.id, { x: clamp(t.x + dx, 0, 1), y: clamp(t.y + dy, 0, 1) }));
              }
            }}
          />
        </div>
        <p className="design__hint">Drag your pet or text on the picture, or use the arrows. Click the picture and use the arrow keys too.</p>
      </div>

      <div className="design__panel">
        <section className="design__section" aria-labelledby="design-pet">
          <h2 id="design-pet" className="design__heading">
            Your pet
          </h2>
          <Slider
            label="Size"
            min={0.3}
            max={2.5}
            step={0.05}
            value={settings.framing.zoom}
            onChange={(zoom) => dispatch(setFraming({ ...settings.framing, zoom }))}
            format={(v) => `${Math.round(v * 100)}%`}
          />
          <div className="design__row">
            <Button
              variant="secondary"
              onClick={() => dispatch(setFraming({ ...settings.framing, offsetX: 0, offsetY: 0 }))}
              disabled={settings.framing.offsetX === 0 && settings.framing.offsetY === 0}
            >
              Re-centre
            </Button>
            <Button variant="quiet" onClick={() => dispatch(setFraming({ zoom: 1, offsetX: 0, offsetY: 0 }))}>
              Reset size and place
            </Button>
          </div>
        </section>

        <section className="design__section" aria-labelledby="design-bg">
          <h2 id="design-bg" className="design__heading">
            Background
          </h2>
          <BackgroundControls filet={filet} />
        </section>

        <section className="design__section" aria-labelledby="design-text">
          <h2 id="design-text" className="design__heading">
            Text
          </h2>
          {settings.texts.length === 0 && <p className="design__muted">Add a name, a date or a few words.</p>}
          <ol className="design__texts">
            {settings.texts.map((t, i) => (
              <TextControls
                key={t.id}
                layer={t}
                index={i}
                filet={filet}
                gridSpec={gridSpec}
                onFocus={() => setSelected(t.id)}
              />
            ))}
          </ol>
          {settings.texts.length < MAX_TEXTS && (
            <Button variant="secondary" onClick={add}>
              + Add text
            </Button>
          )}
        </section>

        <p className="design__muted">
          {filet
            ? 'Filet mesh uses one yarn, so the pattern and text are made in filled squares too.'
            : "Pattern and text yarns are added to your yarn list on top of your pet's colors."}
        </p>
      </div>
    </div>
  );
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function MovePad({ label, onMove }: { label: string; onMove: (dx: number, dy: number) => void }) {
  const step = 0.02;
  const btn = (text: string, aria: string, dx: number, dy: number, cls: string) => (
    <button type="button" className={`move-pad__btn move-pad__btn--${cls}`} aria-label={`Move ${label} ${aria}`} onClick={() => onMove(dx, dy)}>
      {text}
    </button>
  );
  return (
    <div className="move-pad" role="group" aria-label={`Move ${label}`}>
      {btn('↑', 'up', 0, -step, 'up')}
      {btn('←', 'left', -step, 0, 'left')}
      {btn('→', 'right', step, 0, 'right')}
      {btn('↓', 'down', 0, step, 'down')}
    </div>
  );
}

function BackgroundControls({ filet }: { filet: boolean }) {
  const { state, dispatch } = useApp();
  const bg = state.settings.background;
  const groups = useMemo(() => {
    const m = new Map<string, typeof MOTIFS[number][]>();
    for (const motif of MOTIFS) m.set(motif.group, [...(m.get(motif.group) ?? []), motif]);
    return [...m.entries()];
  }, []);
  const bgId = useId();
  const patId = useId();

  return (
    <div className="bg-controls">
      <fieldset className="motifs">
        <legend className="visually-hidden">Background pattern</legend>
        {groups.map(([group, motifs]) => (
          <div key={group} className="motifs__group">
            <p className="motifs__group-title" aria-hidden="true">
              {group}
            </p>
            <div className="motifs__grid">
              {motifs.map((m) => (
                <label key={m.id} className={`motif ${bg.motif === m.id ? 'is-checked' : ''}`}>
                  <input type="radio" name="design-motif" checked={bg.motif === m.id} onChange={() => dispatch(setBackground({ motif: m.id }))} />
                  <MotifSwatch motif={m.id} ink={filet ? '#3b2f25' : bg.colorHex} paper={filet ? '#ffffff' : state.settings.backgroundHex} />
                  <span className="motif__label">
                    {m.label}
                    <span className="visually-hidden"> ({group})</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </fieldset>

      <div className="bg-controls__colors">
        <label className="color-field" htmlFor={bgId}>
          <input
            id={bgId}
            type="color"
            value={state.settings.backgroundHex}
            onChange={(e) => dispatch(updateSettings({ backgroundHex: e.target.value }))}
          />
          <span>{filet ? 'Mesh preview color' : 'Background color'}</span>
        </label>
        {bg.motif !== 'none' && !filet && (
          <label className="color-field" htmlFor={patId}>
            <input id={patId} type="color" value={bg.colorHex} onChange={(e) => dispatch(setBackground({ colorHex: e.target.value }))} />
            <span>Pattern color</span>
          </label>
        )}
      </div>

      {bg.motif !== 'none' && (
        <>
          <Slider
            label="Pattern size"
            min={1}
            max={16}
            step={0.5}
            value={bg.sizeIn}
            onChange={(sizeIn) => dispatch(setBackground({ sizeIn }))}
            format={(v) => `${v} in repeat`}
          />
          <Segmented<MotifDirection> legend="Direction" name="design-direction" value={bg.direction} onChange={(direction) => dispatch(setBackground({ direction }))} options={DIRECTIONS} />
        </>
      )}
    </div>
  );
}

function TextControls({ layer, index, filet, gridSpec, onFocus }: { layer: TextLayer; index: number; filet: boolean; gridSpec: GridSpec; onFocus: () => void }) {
  const { dispatch } = useApp();
  const id = useId();
  const rowsPerInch = gridSpec.rows / gridSpec.finished.height;
  const [tooWide, setTooWide] = useState(false);
  useEffect(() => {
    let live = true;
    textBlock(layer, gridSpec).then((b) => live && setTooWide(b.cols > gridSpec.cols));
    return () => {
      live = false;
    };
  }, [layer, gridSpec]);
  const rowsTall = layer.sizeIn * rowsPerInch;
  const minRows = layer.font === 'stitch' ? 7 : layer.font === 'script' ? 14 : 10;
  const set = (partial: Partial<TextLayer>) => dispatch(updateText(layer.id, partial));

  return (
    <li className="text-layer" onFocusCapture={onFocus}>
      <div className="text-layer__top">
        <label htmlFor={`${id}-text`} className="text-layer__label">
          Text {index + 1}
        </label>
        <button type="button" className="text-layer__remove" onClick={() => dispatch(removeText(layer.id))}>
          Remove
        </button>
      </div>
      <input id={`${id}-text`} className="text-layer__input" value={layer.text} maxLength={40} onChange={(e) => set({ text: e.target.value })} />
      <div className="text-layer__row">
        <label className="text-layer__font">
          <span>Font</span>
          <select value={layer.font} onChange={(e) => set({ font: e.target.value as TextFont })}>
            {(Object.keys(TEXT_FONTS) as TextFont[]).map((f) => (
              <option key={f} value={f}>
                {TEXT_FONTS[f].label}
              </option>
            ))}
          </select>
        </label>
        {!filet && (
          <label className="color-field" htmlFor={`${id}-color`}>
            <input id={`${id}-color`} type="color" value={layer.colorHex} onChange={(e) => set({ colorHex: e.target.value })} />
            <span>Color</span>
          </label>
        )}
      </div>
      <p className="design__muted">{TEXT_FONTS[layer.font].hint}.</p>
      <Slider
        label="Letter height"
        min={1}
        max={24}
        step={0.5}
        value={layer.sizeIn}
        onChange={(sizeIn) => set({ sizeIn })}
        format={(v) => `${v} in · ${Math.round(v * rowsPerInch)} rows`}
      />
      {tooWide && <p className="text-layer__warn">This text is wider than your piece. Make the letters smaller or the text shorter.</p>}
      {rowsTall < minRows && (
        <p className="text-layer__warn">
          Letters this small are hard to read in stitches. Try at least {Math.ceil(minRows / rowsPerInch)} in
          {layer.font !== 'stitch' ? ', or the Stitch font' : ''}.
        </p>
      )}
    </li>
  );
}
