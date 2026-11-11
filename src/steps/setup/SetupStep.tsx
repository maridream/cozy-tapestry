import { useId, useMemo, useState } from 'react';
import { updateSettings, useApp } from '../../app/state';
import { Segmented } from '../../components/Segmented';
import { SIZE_PRESETS, TECHNIQUE_LABELS, YARN_WEIGHT_LABELS } from '../../config/crochet';
import { computeGridSpec, getGauge, validateSize } from '../../engine/sizing';
import type { SizeInches, Technique, YarnWeight } from '../../types';
import { FabricSwatch } from './FabricSwatch';
import { FramingPreview } from './FramingPreview';
import './SetupStep.css';

const fmtIn = (inches: number) => `${Math.round(inches)}`;
const toCm = (inches: number) => Math.round(inches * 2.54);

/** Which preset (if any) a size matches, in either orientation. */
function presetFor(size: SizeInches): string | null {
  const short = Math.min(size.width, size.height);
  const long = Math.max(size.width, size.height);
  return SIZE_PRESETS.find((p) => p.shortFt * 12 === short && p.longFt * 12 === long)?.id ?? null;
}

export function SetupStep() {
  const { state, dispatch } = useApp();
  const { settings } = state;
  const { technique, yarnWeight, size } = settings;
  const [customOpen, setCustomOpen] = useState(() => presetFor(size) === null);
  const family = technique === 'blanket-sc' ? 'blanket' : 'decor';
  const gauge = getGauge(technique, yarnWeight);
  const sizeCheck = validateSize(size);
  const gridSpec = useMemo(() => computeGridSpec(sizeCheck.ok ? size : { width: 24, height: 36 }, gauge), [size, gauge, sizeCheck.ok]);
  const portrait = size.height >= size.width;
  const square = size.width === size.height;
  const selectedChip = customOpen ? 'custom' : (presetFor(size) ?? 'custom');

  const setTechnique = (t: Technique) => dispatch(updateSettings({ technique: t }));
  const setSize = (s: SizeInches) => dispatch(updateSettings({ size: s }));

  const choosePreset = (id: string) => {
    if (id === 'custom') {
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    const p = SIZE_PRESETS.find((x) => x.id === id)!;
    const [short, long] = [p.shortFt * 12, p.longFt * 12];
    setSize(portrait ? { width: short, height: long } : { width: long, height: short });
  };

  const unit = technique === 'decor-filet' ? 'squares' : 'stitches';

  return (
    <div className="setup">
      <div className="setup__settings">
        <fieldset className="setup__group">
          <legend className="setup__legend">What are you making?</legend>
          <div className="choice-cards">
            <ChoiceCard
              name="setup-family"
              checked={family === 'blanket'}
              onSelect={() => setTechnique('blanket-sc')}
              title="Thick blanket"
              blurb={TECHNIQUE_LABELS['blanket-sc'].blurb}
              swatch="sc"
            />
            <ChoiceCard
              name="setup-family"
              checked={family === 'decor'}
              onSelect={() => family !== 'decor' && setTechnique('decor-dc')}
              title="Decorative tapestry"
              blurb="Lighter, with more open stitches. Uses less yarn."
              swatch="dc"
            />
          </div>
          {family === 'decor' && (
            <fieldset className="setup__group setup__group--sub">
              <legend className="setup__legend setup__legend--small">Which kind?</legend>
              <div className="choice-cards choice-cards--small">
                <ChoiceCard
                  name="setup-decor"
                  checked={technique === 'decor-dc'}
                  onSelect={() => setTechnique('decor-dc')}
                  title="Full color"
                  blurb={TECHNIQUE_LABELS['decor-dc'].blurb}
                  swatch="dc"
                />
                <ChoiceCard
                  name="setup-decor"
                  checked={technique === 'decor-filet'}
                  onSelect={() => setTechnique('decor-filet')}
                  title="Filet mesh"
                  blurb={TECHNIQUE_LABELS['decor-filet'].blurb}
                  swatch="filet"
                />
              </div>
            </fieldset>
          )}
        </fieldset>

        <div className="setup__group">
          <Segmented<YarnWeight>
            legend="Yarn weight"
            name="setup-weight"
            value={yarnWeight}
            onChange={(w) => dispatch(updateSettings({ yarnWeight: w }))}
            options={(['dk', 'worsted', 'bulky'] as const).map((w) => ({ value: w, label: YARN_WEIGHT_LABELS[w].split(' (')[0] }))}
            hint={`${YARN_WEIGHT_LABELS[yarnWeight]}. Suggested hook: ${gauge.hookMm} mm (${gauge.hookUs}).`}
          />
        </div>

        <fieldset className="setup__group">
          <legend className="setup__legend">Size</legend>
          <div className="chips">
            {[...SIZE_PRESETS.map((p) => ({ id: p.id, label: p.label })), { id: 'custom', label: 'Custom' }].map((chip) => (
              <label key={chip.id} className="chip">
                <input type="radio" name="setup-size" value={chip.id} checked={selectedChip === chip.id} onChange={() => choosePreset(chip.id)} />
                <span>{chip.label}</span>
              </label>
            ))}
          </div>

          {selectedChip === 'custom' && <CustomSize size={size} onChange={setSize} error={sizeCheck.ok ? null : sizeCheck.message} />}

          {!square && (
            <div className="setup__orientation">
              <Segmented
                legend="Orientation"
                name="setup-orientation"
                value={portrait ? 'portrait' : 'landscape'}
                onChange={(o) => {
                  if ((o === 'portrait') !== portrait) setSize({ width: size.height, height: size.width });
                }}
                options={[
                  { value: 'portrait', label: 'Portrait' },
                  { value: 'landscape', label: 'Landscape' },
                ]}
              />
            </div>
          )}

          <p className="setup__metric">
            {fmtIn(size.width)} × {fmtIn(size.height)} in · {toCm(size.width)} × {toCm(size.height)} cm
          </p>
        </fieldset>

        {sizeCheck.ok && (
          <div className="setup__summary" aria-live="polite">
            <p>
              About {gridSpec.cols} {unit} wide × {gridSpec.rows} rows tall. Finished size about {gridSpec.finished.width.toFixed(0)} ×{' '}
              {gridSpec.finished.height.toFixed(0)} in.
            </p>
            {gridSpec.cols < 40 && <p>Small pieces show less detail — expect the overall shape rather than fine features.</p>}
            <p className="setup__estimate">Sizes are estimates — make a small gauge swatch first.</p>
          </div>
        )}
      </div>

      <div className="setup__preview">
        <h2 className="setup__preview-title">Position your pet</h2>
        <FramingPreview gridSpec={gridSpec} />
      </div>
    </div>
  );
}

function ChoiceCard(props: { name: string; checked: boolean; onSelect: () => void; title: string; blurb: string; swatch: 'sc' | 'dc' | 'filet' }) {
  const id = useId();
  return (
    <label className={`choice-card ${props.checked ? 'is-checked' : ''}`} htmlFor={id}>
      <input id={id} type="radio" name={props.name} checked={props.checked} onChange={props.onSelect} aria-describedby={`${id}-blurb`} />
      <FabricSwatch kind={props.swatch} />
      <span className="choice-card__text">
        <span className="choice-card__title">{props.title}</span>
        <span className="choice-card__blurb" id={`${id}-blurb`}>
          {props.blurb}
        </span>
      </span>
    </label>
  );
}

function CustomSize({ size, onChange, error }: { size: SizeInches; onChange: (s: SizeInches) => void; error: string | null }) {
  const errId = useId();
  const part = (inches: number) => ({ ft: Math.floor(inches / 12), inch: Math.round(inches - Math.floor(inches / 12) * 12) });
  const field = (label: string, value: number, set: (v: number) => void) => {
    const { ft, inch } = part(value);
    const num = (s: string) => (s.trim() === '' ? 0 : Number(s));
    return (
      <fieldset className="custom-size__field">
        <legend>{label}</legend>
        <label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={8}
            value={ft}
            aria-describedby={error ? errId : undefined}
            aria-invalid={!!error}
            onChange={(e) => set(num(e.target.value) * 12 + inch)}
          />
          <span>ft</span>
        </label>
        <label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={11}
            value={inch}
            aria-describedby={error ? errId : undefined}
            aria-invalid={!!error}
            onChange={(e) => set(ft * 12 + num(e.target.value))}
          />
          <span>in</span>
        </label>
      </fieldset>
    );
  };
  return (
    <div className="custom-size">
      <div className="custom-size__fields">
        {field('Width', size.width, (w) => onChange({ ...size, width: w }))}
        {field('Height', size.height, (h) => onChange({ ...size, height: h }))}
      </div>
      {error && (
        <p className="custom-size__error" id={errId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
