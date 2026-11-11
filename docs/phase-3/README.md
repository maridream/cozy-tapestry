# Phase 3 — Pattern engine, "Type & size" and "Colors"

**Goal:** the cutout becomes a real crochet pattern. The user picks what they are making, the yarn weight and the size, positions their pet, chooses colors, and sees a live stitch preview. At the end of this phase `state.pattern` holds a complete `Pattern` (chart, written rows, yarn estimate).

**Read first:** [docs/README.md](../README.md), [ARCHITECTURE.md](../ARCHITECTURE.md), `src/types.ts`, `src/config/crochet.ts`, Phase 2 handoff notes.

**Depends on:** Phase 2 (`getCutout(state)`). **Unblocks:** Phase 4.

This is the largest phase. Build it in this order: **A. engine (pure, tested) → B. preview renderer → C. Type & size step → D. Colors step.**

---

## Crochet reference (domain knowledge the engine encodes)

All numbers live in `src/config/crochet.ts`; never hard-code them elsewhere. They are averages — the UI calls them estimates.

| Technique | Stitch | One chart cell is | Fabric | Colors |
| --- | --- | --- | --- | --- |
| `blanket-sc` Thick blanket | single crochet, unused colors carried inside stitches | 1 sc (nearly square) | dense, no holes | 2–8 |
| `decor-dc` Decorative, full color | double crochet colorwork | 1 dc (about twice as tall as wide) | looser, drapey, small gaps | 2–8 |
| `decor-filet` Decorative, filet mesh | dc + ch mesh | 1 mesh square = 2 stitches: **open** = ch 1, dc; **filled** = 2 dc | open and lacy | 1 yarn |

Row construction (US terms; turned rows, bottom to top):

- **sc:** foundation chain = `cols + 1`. Each row: ch 1 (not a stitch), 1 sc per cell, turn.
- **dc:** foundation chain = `cols + 2`. Each row: ch 2 (not a stitch), 1 dc per cell, turn.
- **filet:** a row has `2 × cols + 1` stitches (an edge dc, then 2 per cell). Foundation chain = `2 × cols + 3`. Each row: ch 3 (counts as the edge dc), then each cell is either open (ch 1, skip 1, dc in next) or filled (dc in next 2), turn.

Because dc cells are not square, the chart for `decor-dc` has far fewer rows than columns per foot. The engine and the preview must always use `cellWidthIn` / `cellHeightIn`, never assume square cells.

---

## A. Engine (`src/engine/`, pure functions)

Stubs with signatures exist for every file. No React, no DOM, no `document`/`canvas` in this folder except `renderPreview.ts`. Treat `ImageData` as a plain `{ width, height, data }` record so tests can build fakes.

### `sizing.ts`

`computeGridSpec(size, gauge)`:

```
cols = max(1, round(size.width  × gauge.cellsPerInch))
rows = max(1, round(size.height × gauge.rowsPerInch))
cellWidthIn  = 1 / gauge.cellsPerInch
cellHeightIn = 1 / gauge.rowsPerInch
finished = { width: cols × cellWidthIn, height: rows × cellHeightIn }
```

Also add `validateSize(size): { ok: true } | { ok: false; message: string }` using `SIZE_LIMITS`: both sides ≥ 12 in, shorter side ≤ 60 in, longer side ≤ 96 in. Messages in plain words ("The longest side can be up to 8 ft.").

Reference values (use as tests):

| Size | Weight | Technique | cols × rows |
| --- | --- | --- | --- |
| 24 × 36 in | worsted | blanket-sc | 96 × 162 |
| 24 × 36 in | worsted | decor-dc | 84 × 68 |
| 24 × 36 in | worsted | decor-filet | 42 × 68 |
| 12 × 12 in | bulky | decor-filet | 15 × 17 |
| 60 × 96 in | dk | blanket-sc | 300 × 528 |

### `color.ts`

- `hexToRgb`, `rgbToHex` (lower-case `#rrggbb`), `rgbToLab` (sRGB → linear → XYZ D65 → CIELAB), `labDistanceSq` (CIE76).
- `nameColor(rgb)`: plain-language names built from lightness, chroma and hue. Rules of thumb: very low chroma → white / light grey / grey / charcoal / black by lightness; warm low-chroma lights → cream, beige, tan; dark warm → brown family ("warm brown", "dark brown", "chestnut"); otherwise a hue word (red, orange, golden yellow, green, teal, blue, purple, pink) with an optional "light", "soft" or "dark" modifier. Keep names to one or two words.
- `uniqueNames(names: string[]): string[]` — when two palette colors get the same name, differentiate by lightness ("light grey" / "dark grey") and, failing that, append " 2", " 3".

Required name tests: `#ffffff` → "white"; `#000000` → "black"; `#808080` contains "grey"; `#8b5a2b` contains "brown"; `#f3e9d8` → "cream"; `#d62828` contains "red".

### `buildGrid.ts`

#### Step 1 — framing and resampling (shared by all techniques)

Add an exported helper `resampleToCells(cutout, gridSpec, framing)` returning, per cell, the average color of **pet pixels only** and the pet coverage (0–1).

Geometry:

1. Find the pet's bounding box in the photo (mask > 127). Let `bw`, `bh` be its size in pixels and `(bcx, bcy)` its centre.
2. The piece is `W = gridSpec.finished.width`, `H = gridSpec.finished.height` inches.
3. Default fit leaves an 8% margin on every side: `fit = min(0.84 × W / bw, 0.84 × H / bh)` (inches per photo pixel). `scale = fit × framing.zoom`.
4. The pet's centre lands at `(W/2 + framing.offsetX × W, H/2 + framing.offsetY × H)`.
5. For each cell, take its rectangle in piece inches, map it back to a rectangle in photo pixels, and average the pixels inside it weighted by mask value. `coverage` = sum of mask weights / (255 × pixel count). Cells that map outside the photo have coverage 0. If a cell's rectangle is smaller than one pixel, sample the nearest pixel.

Averaging pet pixels only (weighted by mask) matters: it stops background color bleeding into the pet's outline.

#### Step 2 — `buildPatternGrid` (sc and dc)

1. Resample. A cell is **pet** if coverage ≥ 0.5, otherwise **background** (palette index 0).
2. Convert pet cell colors to Lab. Run **k-means** with `k = settings.colorCount − 1`:
   - k-means++ seeding using a small seeded PRNG (e.g. mulberry32, seed 1) so results are deterministic;
   - at most 25 iterations or until assignments stop changing;
   - if there are more than 20,000 pet cells, fit on an evenly spaced sample of 20,000 then assign all cells;
   - if there are fewer distinct colors than `k`, return fewer colors rather than empty clusters.
3. Build the palette: index 0 = background (`hex = settings.backgroundHex`, `role: 'background'`, name from `nameColor`), then pet colors ordered by number of cells, largest first. `id` = `"c0"`, `"c1"`… `autoHex` = the picked color.
4. Re-attach user edits: for each entry in `lockedPalette` with `role: 'subject'`, find the not-yet-claimed new pet color nearest to its `autoHex` (Lab) and overwrite that color's `hex` and `name`, set `userEdited: true`. An edited background is simply `settings.backgroundHex` plus its edited name.
5. Apply `smoothGrid(grid, settings.smoothing)`.
6. Drop palette entries that ended up with zero cells (re-index cells), except the background which always stays at index 0.
7. Make names unique.

This is what delivers the owner's "solid color, not every skin/fur tone" requirement: few colors + smoothing. Do not dither.

#### Step 3 — `buildFiletGrid`

Palette is exactly two entries: index 0 "open mesh" (`role: 'background'`, hex = `settings.backgroundHex`, only used for the preview), index 1 the yarn (`role: 'subject'`; default hex = the pet's average color; user-editable like any other color).

1. Resample. Cell is **filled** (1) if coverage ≥ 0.5, else **open** (0).
2. If `settings.filetShowDetails`: among filled cells compute lightness `L`. Let `m` = median, `σ` = standard deviation. Cells with `|L − m| > max(18, 1.5σ)` become open (these are eyes, nose, strong markings). If that would open more than 25% of the pet, raise the threshold until it is ≤ 25%.
3. Apply `smoothGrid`.

#### `smoothGrid(grid, level)`

Works on 4-connected regions of identical palette index.

- Level 0 (Crisp): no change.
- Level 1 (Balanced): any region of **1–2 cells** is recolored to the most common color among its bordering cells.
- Level 2 (Smooth): regions of **1–5 cells** are recolored the same way, then one pass of a 3×3 majority filter (a cell changes only if at least 5 of its 8 neighbours share one other color).

Returns a new grid; never mutates its input.

### `writtenRows.ts`

`buildWrittenRows(grid, technique)` returns one `WrittenRow` per chart row, **crochet row 1 first** (the bottom chart row).

- Crochet row `n` (1-based) is chart row index `rows − n`.
- Odd `n` = RS, worked right-to-left: read the chart row from the last column to the first. Even `n` = WS: first column to last.
- Run-length encode consecutive equal cells into `RowRun`s.
- `stitch`: `'sc'` for blanket-sc, `'dc'` for decor-dc; for filet `'open'` / `'filled'`.
- `text` formats:
  - sc/dc: `Row 12 (WS): 14 sc cream, 6 sc warm brown, 20 sc cream` — count, stitch, color name, comma-separated.
  - filet: `Row 12 (WS): 4 open, 6 filled, 11 open`.
- Add `rowStitchCount(row)` if useful to the UI (sum of counts).

`foundationChainLength(cols, technique)`: sc → `cols + 1`; dc → `cols + 2`; filet → `2 × cols + 3`.

Test fixture: a 4-column, 2-row grid with palette `[cream, brown]` and cells (top row first) `[0,1,1,0]`, `[1,0,0,0]`, technique sc →

```
Row 1 (RS): 3 sc cream, 1 sc brown
Row 2 (WS): 1 sc cream, 2 sc brown, 1 sc cream
```

(Row 1 is the bottom chart row `[1,0,0,0]` read right-to-left.)

### `yarnEstimate.ts`

Let `y = YARN_INCHES_PER_STITCH[yarnWeight]`, `t = TURNING_CHAINS[technique]`.

**sc and dc** (`s` = `y.sc` or `y.dc`), inches per color:

1. Stitches: `(cells of that color) × s`.
2. Carried yarn: for each row and each color present in that row, `span = lastCol − firstCol + 1`; `carriedCells = span − (cells of that color in the row)`; add `carriedCells × cellWidthIn × 1.1`. (A color is carried inside the other stitches between its first and last use in a row, and cut/dropped outside that span.)
3. Chains: the foundation chain (`foundationChainLength × y.ch`) and all turning chains (`rows × t × y.ch`) are charged to the **background** color (index 0).

**filet** (single yarn, palette index 1): `foundation (2·cols + 3) × y.ch` + for each row `3 × y.ch` + per open cell `y.ch + y.dc` + per filled cell `2 × y.dc`.

Then for every color: multiply by `1 + YARN_BUFFER_FRACTION`, `yards = inches / 36`, `meters = yards × 0.9144`, `skeins = ceil(yards / yardsPerSkein)`. Omit colors with zero yarn. Totals are sums of the lines. Round for **display** only (yards and meters to whole numbers, rounded up); keep full precision in the returned values.

Test fixtures (worsted):

| Case | Expected |
| --- | --- |
| Solid one-color 96 × 162 blanket-sc | 23,328 + 58.2 + 97.2 = 23,483.4 in → ×1.1 → **717.5 yd**, 4 skeins at 200 yd |
| Solid one-color 84 × 68 decor-dc | 21,134.4 + 51.6 + 81.6 = 21,267.6 in → ×1.1 → **649.8 yd** |
| All-open 42 × 68 filet | 68 × (1.8 + 42 × 4.3) + 87 × 0.6 = 12,455.4 in → ×1.1 → **380.6 yd** |
| sc row `[A,A,B,B,A,A,B,A,A,A]` | carried: A = 3 cells → 0.825 in; B = 2 cells → 0.55 in (before buffer) |

### `buildPattern.ts`

```
gauge     = getGauge(settings.technique, settings.yarnWeight)
gridSpec  = computeGridSpec(settings.size, gauge)
grid      = technique === 'decor-filet' ? buildFiletGrid(...) : buildPatternGrid(...)
rows      = buildWrittenRows(grid, technique)
estimate  = estimateYarn(grid, gridSpec, technique, yarnWeight, settings.yardsPerSkein)
return { settings, gauge, gridSpec, grid, rows, foundationChain, estimate }
```

Must meet the performance budget in ARCHITECTURE.md (300 × 528 in under 1 s). Add a test that builds that size from a synthetic 2048 px image and asserts it completes (generous 5 s limit for CI).

---

## B. Preview renderer — `src/engine/renderPreview.ts` (new)

`renderPreview(canvas, grid, gridSpec, technique, options?)` draws the chart as it will look when made:

- Scale so the piece fits the canvas while keeping the true finished proportions (`cellWidthIn : cellHeightIn`). Account for `devicePixelRatio`.
- sc / dc: each cell a filled rectangle in its yarn color. When cells are at least ~6 px, add a faint darker line under each row to suggest stitches.
- filet: filled cells solid in the yarn color; open cells show the page surface through a thin yarn-colored outline, so the mesh reads as holes.
- Optional `options.gridLines` for a light grid every 10 cells (used by Phase 4).

Also export `renderPreviewToBlob(grid, gridSpec, technique, widthPx): Promise<Blob>` (PNG) for the PDF cover in Phase 4.

---

## C. Step 3 — "Type & size"

Layout: settings on the left, framing preview on the right (stacked on phones, preview first).

1. **"What are you making?"** — two large selectable cards:
   - **Thick blanket** — blurb from `TECHNIQUE_LABELS['blanket-sc']`.
   - **Decorative tapestry** — "Lighter, with more open stitches. Uses less yarn." Selecting it reveals a second choice directly underneath: **Full color** (`decor-dc`) / **Filet mesh** (`decor-filet`), each with its blurb. Default to Full color.
   - Each card has a small illustrative swatch drawn in CSS/SVG showing the fabric character (tight grid, tall stitches, open mesh).
2. **Yarn weight** — segmented control: DK / Worsted / Bulky (labels from `YARN_WEIGHT_LABELS`). Under it: "Suggested hook: 5 mm (H-8)" from the gauge. Changing the weight resets `yardsPerSkein` to that weight's default.
3. **Size** — preset chips from `SIZE_PRESETS` plus a **Custom** chip. A **Portrait / Landscape** toggle (hidden when the size is square). Custom reveals Width and Height, each as feet + inches number fields, validated with `validateSize`; show the error inline and disable Next while invalid. Show the metric equivalent beside the size ("61 × 91 cm").
4. **Summary line** (updates live): "About 96 stitches wide × 162 rows tall. Finished size about 24 × 36 in." If `cols < 40`: add "Small pieces show less detail — expect the overall shape rather than fine features."
5. **Framing preview** — a canvas in the piece's proportions showing the cutout pet (photo pixels, not stitches) over the background color, exactly as `resampleToCells` will place it. Drag to move (pointer events; arrow keys move in 2% steps when focused), **Zoom** slider 0.5×–2×, **Re-centre** button. Updates `settings.framing`.

Next is enabled when the size is valid. Orientation default: match the pet's bounding box (taller than wide → portrait).

## D. Step 4 — "Colors"

Layout: large stitch preview (`renderPreview`) on the left, controls on the right (stacked on phones).

The pattern is built with `buildPattern` when the step opens and again ~150 ms after any change; store it with `setPattern`. Show a subtle "Updating…" state rather than blanking the preview.

For **Thick blanket** and **Decorative — full color**:

- **Number of colors** — slider 2–8 (`COLOR_COUNT`), label "Colors (including background): 4". Hint: "Fewer colors are easier to crochet."
- **Color list** — one row per palette color, background first (tagged "Background"):
  - a round swatch button that opens a color picker (native `<input type="color">` is fine);
  - an editable name field;
  - share of the piece ("32%");
  - a small "Reset" link when the color has been edited.
  Editing a pet color stores it in `lockedPalette` (with its `autoHex`); editing the background updates `settings.backgroundHex`. Hint above the list: "Click a color to match yarn you already have."
- Changing the number of colors clears pet color edits; say so in a quiet note the first time ("Changing the number of colors resets your swaps").
- **Detail** — segmented: Crisp / Balanced / Smooth → `smoothing` 0 / 1 / 2. Hint: "Smooth removes stray single stitches."

For **Decorative — filet mesh**:

- No slider. **Yarn color** swatch + name (one color).
- Toggle: "Show eyes and nose as open squares" → `filetShowDetails`.
- **Detail** control as above.

Below the controls in all modes, a quiet line: "About 1,240 yd of yarn in total" from `pattern.estimate` (full breakdown comes on the next step).

Next is enabled when `state.pattern` exists and matches the current settings.

### State additions

Actions: `updateSettings(partial)`, `setFraming`, `editColor(color)`, `resetColor(id)`, `setPattern(pattern)`. Any settings change clears `pattern` until rebuilt. `isStepComplete('setup')` = valid size; `isStepComplete('colors')` = pattern present.

---

## Tests (all in `tests/`, pure)

- `sizing.test.ts` — reference table above; `validateSize` limits.
- `color.test.ts` — hex round-trip; Lab of white ≈ (100, 0, 0); naming cases; unique names.
- `buildGrid.test.ts` — synthetic image (e.g. left half red pet, right half masked out): background cells are index 0; with `colorCount` 3 and a two-tone pet you get exactly 3 palette entries; determinism (two runs equal); framing offset shifts the pet; locked color re-attachment; filet filled/open follows the mask; `filetShowDetails` opens a dark patch.
- `smoothGrid.test.ts` — single speck removed at level 1, kept at level 0; 4-cell blob kept at level 1, removed at level 2; input not mutated.
- `writtenRows.test.ts` — fixture above; filet text; foundation chain formulas.
- `yarnEstimate.test.ts` — fixtures above; zero-cell colors omitted; skeins round up.
- `buildPattern.test.ts` — end-to-end shape and the performance case.

## Out of scope

The Pattern step UI, PDF, written-rows display, deployment (all Phase 4). Real yarn-brand matching. Dithering or shading.

## Acceptance checklist

- [ ] All engine tests pass; fixtures above match exactly (yardage within 0.1 yd).
- [ ] Type & size: switching technique, weight, size and orientation updates the summary line; invalid custom sizes are explained and block Next.
- [ ] Dragging and zooming the pet in the framing preview changes where it appears in the Colors preview.
- [ ] Colors: the slider changes the number of colors in the preview; editing a color updates the preview and survives a Detail change; Reset restores the auto color.
- [ ] The decorative full-color preview is visibly made of tall cells; the filet preview shows holes.
- [ ] A 5 × 8 ft DK blanket builds without freezing the page.
- [ ] Going back to Cutout, editing the mask, and returning rebuilds the pattern.
- [ ] Works at 360 px wide and with keyboard only (framing via arrow keys).
- [ ] `npm run typecheck`, `npm test`, `npm run build` pass.

## Handoff notes

_(Worker: any formula deviations, measured build times, whether a Web Worker was needed, names of exported helpers Phase 4 should use.)_
