# Phase 5 — Design step: patterned backgrounds, text, and placing the pet

**Goal:** after "Type & size", a new **Design** step lets the user place and resize their pet anywhere on the piece, choose a patterned background, and add text — all as real stitches that appear in the chart, written rows, yarn list and PDF.

Added after the original plan, at the owner's request (November 2026).

## Owner decisions

| Topic | Decision |
| --- | --- |
| Where | A new **Design** step: Photo → Cutout → Type & size → **Design** → Colors → Pattern. Type & size keeps a read-only preview of the piece's shape. |
| Yarn colors | Pattern and text yarns are added **on top of** the pet's colors (the 2–8 color slider is for the pet + background only). |
| Patterns | Many motifs, including species themes; adjustable size, direction (across, up and down, both diagonals) and color. |
| Text | Several fonts, size, color, and free placement. |
| Pet | Resize and move freely (left/right/up/down). |

## What the user gets

- **Live stitch preview** (the real pattern, rebuilt ~60 ms after each change). Drag the pet or any text on it; arrow keys move the selected item (Shift = bigger steps); an on-screen arrow pad does the same for touch and keyboard users. A dashed outline shows what is selected; a "Move: Pet / Text 1 / Text 2" switch selects without dragging.
- **Your pet:** Size 30–250 %, Re-centre, Reset size and place.
- **Background:** 22 motifs in groups — Simple (plain, dots, stripes, zigzag, checks, hearts, stars), Dogs (bones, paws), Cats (fish, yarn balls), Birds (feathers, seeds), Reptiles (scales, leaves), Fish (bubbles, waves), Wild (tiger stripes, leopard spots), Small pets (carrots, clover), Horses (horseshoes). Background color, pattern color, pattern size (1–16 in repeat), direction.
- **Text:** up to 3 pieces. Fonts: **Stitch** (built-in 5×7 pixel font, crisp at any size), Bold (Nunito), Serif (Fraunces), Script (Pacifico), Chunky (Bungee). Letter height 1–24 in (shown in rows too), color. Warnings when letters are too small to read in stitches, or the text is wider than the piece.

## How it works

- **Settings** (`src/types.ts`): `PatternSettings.background: BackgroundPattern` and `texts: TextLayer[]`. Positions are fractions of the piece; sizes are inches, so designs keep their look when the gauge, technique or size changes.
- **Motifs** (`src/engine/motifs.ts`, pure): each motif is a function on a repeating unit tile, evaluated in **inches** (so shapes stay right on tall dc cells), rotated for the direction, every other row offset for sprite motifs, 4 samples per cell with a majority vote. Pixel-art sprites live in `SPRITES`; geometric ones are formulas.
- **Text** (`src/steps/design/textBlocks.ts`): each layer becomes a `TextBlock` of cells. Stitch font: `src/engine/pixelFont.ts` (pure; each font pixel = a whole number of stitches). Other fonts: drawn on an OffscreenCanvas with 4×4 supersampling per cell, stretched for non-square cells, thresholded, trimmed. Cached by text/font/size/gauge, so dragging only re-places the block.
- **Layering** (`decorate` / `decorateFilet` in `src/engine/buildGrid.ts`): background → motif (on background cells only) → pet → text (always on top). Smoothing runs on the pet **before** decorations, so thin text strokes and small motifs survive. Each distinct decoration color becomes a palette entry with `role: 'decoration'`, unless it exactly matches an existing yarn (then that yarn is reused).
- **Filet** (one yarn): motif and text are filled squares; a one-square open gap is kept where the motif meets the pet or text; text over the pet is cut out as open squares.
- **Building:** `buildPattern(cutout, settings, lockedPalette, textBlocks)`; the shared hook `src/app/usePatternBuild.ts` rasterizes text and builds for both the Design and Colors steps.
- **Colors step:** decoration yarns appear as read-only rows ("Change it on the Design step"). **Pattern page / PDF:** facts include "Background: Paws, diagonal, 5 in repeat" and the text; chart letters and the yarn list include the new yarns automatically.

## Tests

`tests/design.test.ts`: every motif draws something (Plain draws nothing); direction turns stripes; size changes the repeat; dots stay round on tall dc cells; pixel font sizes, lower case and unknown characters; motif only on background as its own yarn; text on top and untouched by smoothing; color reuse; text placement; filet gap and cut-out text.

## Acceptance checklist

- [x] Design step appears between Type & size and Colors; Type & size shows a read-only shape preview.
- [x] All 22 motifs render; color, size and all four directions change the preview.
- [x] Text: add up to 3, edit, change font/size/color, remove; drag on the preview; warnings for small or too-wide text.
- [x] Pet: drag, arrow keys, arrow pad, size slider, re-centre.
- [x] Colors step lists pattern/text yarns; Pattern page facts and yarn list include them.
- [x] Filet: one yarn, gap around pet/text, text over the pet cut out.
- [x] 360 px wide: no overflow, preview first. `npm run typecheck`, `npm test` (91), `npm run build` pass.

## Handoff notes

- Main bundle grew to ~313 KB (~99 KB gzip); Pacifico and Bungee load only when used.
- Filet is coarse (e.g. 42 × 68 squares for 2 × 3 ft worsted), so busy motifs plus text can look crowded — larger pattern sizes and the Stitch font read best.
- Not verified: Safari/Firefox/iOS; real crocheted text legibility (the warnings use rules of thumb: ≥ 7 rows for Stitch, ≥ 10 for Bold/Serif/Chunky, ≥ 14 for Script).
- Ideas: rotate text, curved text, outline around the pet, a motif under only part of the piece (border).
