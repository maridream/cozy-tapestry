# Phase 2 — Pet cutout: automatic background removal and touch-up

**Goal:** on the **Cutout** step the app finds the pet automatically, shows the result, and lets the user fix it with a simple keep/erase brush. The output is a `CutoutImage` (`photo` + `mask`) in app state.

**Read first:** [docs/README.md](../README.md), [ARCHITECTURE.md](../ARCHITECTURE.md), Phase 1 handoff notes.

**Depends on:** Phase 1 (state, components, upload). **Unblocks:** Phase 3.

## What the user sees — Step 2 "Cutout"

### While working

On entering the step with a photo and no mask, the cutout starts automatically. Show the photo dimmed with a progress bar and a friendly line: "Finding your pet… the first time takes a little longer while we fetch the helper" (the model download). Progress reflects download + processing. The user can go Back at any time (cancel/ignore the result).

### Result view

- The photo with everything that is **not** the pet covered by a soft tinted veil (use the theme's sunken surface color at ~75% opacity) so the pet clearly stands out. A **Show: Cutout / Original** segmented toggle switches the veil off to compare.
- Toolbar:
  - **Brush mode** (segmented): **Keep** (paint to add to the pet) / **Erase** (paint to remove).
  - **Brush size** slider (small → large; on-canvas circle cursor shows the size).
  - **Undo** and **Redo** buttons (also Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z).
  - **Start again** — restores the automatic cutout (confirm if there are edits).
- One helper line: "Paint over anything we missed. It doesn't need to be perfect — the pattern simplifies small details."
- **Next** is enabled when the mask contains a meaningful subject (at least 1% of pixels marked as pet). Otherwise: "Paint over your pet with Keep to continue."

### If automatic cutout fails

If the model cannot load (offline, unsupported browser) or returns an empty mask, do not block the user. Show: "We couldn't find your pet automatically. Paint over your pet with the Keep brush, or use the whole photo." with a **Use whole photo** button (mask = everything). The brush tools work as normal on an initially empty mask.

## Technical spec

### Segmenter — `src/segmentation/segmenter.ts`

The interface is already declared:

```ts
interface SubjectSegmenter {
  segment(image: ImageData, onProgress?: (fraction: number) => void): Promise<Uint8ClampedArray>;
}
function createSegmenter(): Promise<SubjectSegmenter>;
```

- The returned mask is one byte per pixel, same width × height as the input, 0 = background, 255 = pet. Soft edges allowed.
- The library must be loaded with a dynamic `import()` inside `createSegmenter` so it is a separate chunk and is fetched only when the Cutout step is first reached.
- Cache the created segmenter in a module variable so a second photo does not reload the model.
- If the library returns an RGBA image with transparency, take its alpha channel as the mask. If it returns a lower-resolution mask, scale it up to the photo's size (bilinear).
- Run inference on a copy downscaled to the model's preferred size if the library does not do this itself; never block the UI thread for seconds without progress — prefer the library's worker/WASM-thread options.

### Choosing the library

Requirements, in priority order:

1. Runs **fully in the browser** (WASM/WebGPU/WebGL) — the photo must not be sent to any server.
2. Works on **any kind of pet**, not only cats and dogs — so a general "main subject / salient object" model, not a fixed-class one.
3. **License compatible with a public GitHub project.** Check both the code license and the model-weights license.
4. Reasonable download (ideally under ~50 MB) and under ~10 s on a typical laptop.

Candidates known at planning time — **verify the current state of each before choosing**:

| Candidate | Why consider | Watch out for |
| --- | --- | --- |
| `@imgly/background-removal` | Purpose-built, one function call, good results on animals | Believed to be AGPL-licensed: the whole project would then need an AGPL-compatible license. Model files load from the vendor's CDN by default (can be self-hosted). |
| `@huggingface/transformers` + a background-removal / salient-object model | Flexible; several models to choose from | Model licenses vary — some popular ones are non-commercial only. Pick one with a permissive license (MIT/Apache). |
| `@mediapipe/tasks-vision` image segmenter (DeepLab-style) | Small, fast, Apache-licensed | Only recognises a fixed list of classes (cat, dog, bird, horse…) — fails on rabbits, reptiles, etc. Use only as a last resort. |

Coarse edges are acceptable: the largest chart is only a few hundred cells wide, so mask precision beyond that is wasted. Prefer the smaller/faster model when quality is similar.

> **Owner decision (after planning):** the project is **AGPL-3.0-or-later**, so `@imgly/background-removal` (verified AGPL-3.0, v1.7.0, November 2026) is approved — use it unless it fails the other requirements. Still check its model-weights license, and avoid any non-commercial model. Alternatives checked at the same time, for reference: BiRefNet-lite (MIT) is ~115 MB even at fp16; MediaPipe (Apache-2.0) only knows fixed classes.

**Ask the owner** before adopting a library whose license forces a license on the whole project (e.g. AGPL), and record the final choice, version, model name, model size and license in the handoff notes and in the root README under a new "Credits" heading.

Model hosting: if the model files are each under 50 MB, copy them into `public/models/` so the site is self-contained; otherwise load from the library's CDN and note that in the README privacy line ("the helper model is downloaded from …; your photo is not uploaded").

### Mask editing — `src/segmentation/maskBrush.ts` + `src/steps/cutout/`

- Display: one `<canvas>` sized to fit the card (CSS-scaled; keep the internal resolution equal to the photo for accuracy, or a capped working size of 1024 px on the long side with the mask scaled back up on commit — either is fine).
- Painting uses **pointer events** (mouse, touch and pen with one code path). `touch-action: none` on the canvas so painting does not scroll the page. Interpolate between pointer positions so fast strokes leave no gaps.
- `paintStroke(mask, width, height, points, radius, value)` is a pure function (value 255 for Keep, 0 for Erase) writing hard-edged circles into the mask — put it in `maskBrush.ts` and unit-test it.
- Brush radius is defined in photo pixels, scaled from the slider as a fraction of the photo's shorter side (about 1% to 10%).
- **Undo/redo:** keep a stack of mask snapshots, one per completed stroke, capped at 20. Clear redo on a new stroke.
- Commit to app state at stroke end (not on every pointer move): dispatch `setMask(mask)`. Re-render the veil from the working mask during the stroke for responsiveness.
- Keyboard users cannot paint; that is acceptable, but **Use whole photo** and **Start again** must be keyboard-reachable so the step is never a dead end.

### State additions

Actions: `setAutoMask(mask)` (also sets `mask` to a copy), `setMask(mask)`, `resetMask` (mask ← copy of autoMask). `setMask` clears `pattern`. `isStepComplete('cutout')` = mask exists and ≥ 1% of pixels are > 127.

Expose a selector `getCutout(state): CutoutImage | null` for Phase 3.

Replace the Phase 1 placeholder for step 2. Remove the temporary "Next always allowed" rule for this step.

## Tests

- `tests/maskBrush.test.ts`: a stroke sets pixels within the radius and leaves others; Erase clears; strokes clipped at image edges do not throw; interpolation leaves no gaps between two distant points.
- Reducer tests for `setAutoMask`, `setMask`, `resetMask` and the 1% rule.
- The segmenter itself is not unit-tested (needs a browser + model); verify by hand with the photos below.

## Manual test photos

Try at least: a dog on grass, a cat on a patterned sofa, a dark pet on a dark background, a white pet on a light background, a pet held by a person, a non-cat/dog pet (rabbit, bird or reptile), a phone photo of 12 MP. Note results in the handoff notes.

## Out of scope

Cropping/positioning (Phase 3 handles framing), background color choice (Phase 3, Colors step), multiple pets as separate subjects, zooming the editing canvas.

## Acceptance checklist

- [ ] Entering the step runs the cutout automatically with visible progress; the photo is never sent over the network (check the browser's Network tab: only model/asset downloads, no uploads).
- [ ] The pet is clearly separated in the common cases above.
- [ ] Keep/Erase painting works with mouse and touch; brush size changes; Undo/Redo/Start again work.
- [ ] With the network offline (after first load) or the model blocked, the fallback message and **Use whole photo** appear and the user can continue.
- [ ] Going Back to Photo and choosing a new photo re-runs the cutout; returning to Cutout with an existing mask does **not** re-run it.
- [ ] The model code is in its own chunk (`npm run build` output shows it separate from the main bundle).
- [ ] `npm run typecheck`, `npm test`, `npm run build` pass.

## Handoff notes

_(Worker: library + version + model + license, hosting choice, known weak cases, anything Phase 3 should know about mask quality.)_
