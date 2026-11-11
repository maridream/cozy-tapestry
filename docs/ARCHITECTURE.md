# Architecture

## Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Build | Vite | `base: './'` so the build works at any GitHub Pages path |
| UI | React + TypeScript (strict) | Function components and hooks only |
| State | One React context + `useReducer` | No state library, no router |
| Styling | Plain CSS files using the variables in `src/styles/theme.css` | No CSS framework. One CSS file per component/step, imported by it |
| Tests | Vitest (`tests/**/*.test.ts`, node environment) | Engine code is pure and tested; UI is verified by hand in the browser |
| Background removal | In-browser ML model (Phase 2 chooses the library) | Loaded lazily with dynamic `import()` |
| PDF | `jspdf` (Phase 4) | Loaded lazily with dynamic `import()` |

There is **no backend**. Nothing the user uploads leaves their browser. The only network requests after page load are for the app's own files and the background-removal model.

## Folder map

```
src/
  main.tsx              entry point
  types.ts              shared data contracts (read this first)
  config/
    crochet.ts          gauge, yarn-per-stitch, skein sizes, size presets, color limits
    steps.ts            wizard steps in order
  styles/
    theme.css           design tokens for both themes
    base.css            global element styles
  app/                  Phase 1: App.tsx, state.tsx (context + reducer), Header, Stepper, StepLayout, ThemeToggle
  components/           Small shared widgets (Button, Card, Slider, Segmented, Swatch …)
  steps/                One folder or file per wizard step: UploadStep, CutoutStep, SetupStep, ColorsStep, PatternStep
  segmentation/         Phase 2: segmenter.ts (+ mask brush helpers)
  engine/               Phase 3: pure functions, no React, no DOM
    sizing.ts           size + gauge -> GridSpec
    color.ts            color conversion, distance, naming
    buildGrid.ts        cutout -> PatternGrid (resample, quantize, smooth; filet variant)
    writtenRows.ts      PatternGrid -> WrittenRow[]
    yarnEstimate.ts     PatternGrid -> YarnEstimate
    buildPattern.ts     one call that runs all of the above
    renderPreview.ts    (Phase 3 adds) PatternGrid -> canvas drawing
  export/
    pdf.ts              Phase 4: Pattern -> PDF Blob
tests/                  Vitest unit tests for config and engine
```

## Data flow

```
File (photo)
  │  Phase 1: decode, fix rotation, downscale to max 2048 px
  ▼
ImageData ──► Phase 2: segmenter ──► mask ──► brush edits ──► CutoutImage { image, mask }
                                                                  │
PatternSettings (technique, yarn weight, size, framing,           │
                 color count, background, smoothing) ─────────────┤
                                                                  ▼
                          Phase 3: buildPattern(cutout, settings, lockedPalette)
                                                                  │
                                                                  ▼
            Pattern { gauge, gridSpec, grid, rows, foundationChain, estimate }
                                                                  │
                     Phase 4: Pattern page (preview, yarn list, rows) + exportPatternPdf
```

`buildPattern` is deterministic: the same inputs always give the same pattern (k-means uses a fixed seed).

## App state (Phase 1 creates, later phases extend)

```ts
interface AppState {
  step: WizardStepId;
  photo: ImageData | null;          // set by Upload
  photoName: string | null;
  autoMask: Uint8ClampedArray | null; // Phase 2: model output, kept for "Reset"
  mask: Uint8ClampedArray | null;     // Phase 2: after brush edits
  settings: PatternSettings;          // Phase 3 (defaults exist from Phase 1)
  lockedPalette: YarnColor[];         // Phase 3: colors the user hand-edited
  pattern: Pattern | null;            // Phase 3: last built pattern
}
```

Rules:

- Changing something upstream clears what depends on it: a new photo clears masks, palette and pattern; a changed mask clears the pattern.
- A step's **Next** button is enabled only when that step's output exists (photo → mask → valid settings → pattern).
- The stepper lets the user jump back to any step already completed, never forward past an incomplete one.
- Large binary data (`ImageData`, masks) lives in state by reference; never copy it on every render.

## Conventions

- **Row order.** In `PatternGrid.cells`, row index 0 is the **top** of the picture. Crochet **row 1 is the bottom** row (`rows - 1`). Odd crochet rows are the right side (RS) and are worked **right to left** across the chart; even rows (WS) are worked **left to right**. `WrittenRow.runs` are always listed in the order worked.
- **Palette index 0 is always the background.** For filet, index 0 = open mesh, index 1 = filled block.
- **Units.** Internally everything is inches. Display feet/inches and centimetres where a size is shown; yards and meters where yarn is shown.
- **US crochet terms** everywhere.
- **Numbers are estimates.** Any screen or PDF page showing gauge, finished size or yardage carries a short "estimate — make a gauge swatch" note.
- **Colors in CSS** come only from `theme.css` variables. Yarn colors (user data) are the one exception and are set inline.
- **Accessibility.** Every control is reachable by keyboard and has a visible label; contrast meets WCAG AA in both themes; hit targets are at least 44 px; the layout works from 360 px wide phones up.
- **Tone of copy.** Warm, plain, short. No technical words ("segmentation", "quantize", "mask") in the UI — say "cutout", "colors", "tidy up".
- **Errors** are shown inline in friendly language with a way forward, never as raw exceptions.

## Performance budget

- Largest chart: 5×8 ft blanket in DK = 300 × 528 cells (≈158k). `buildPattern` must finish in under 1 second for this on a mid-range laptop. If it does not, move it to a Web Worker; otherwise keep it on the main thread and debounce slider input by ~150 ms.
- The main JS bundle should stay small; the segmentation model and PDF library must be in separate lazily loaded chunks.
