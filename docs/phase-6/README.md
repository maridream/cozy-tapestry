# Phase 6 — Pattern library: stitch-drawn motifs, lace, prints, borders and frames

**Goal:** make the Design step's backgrounds look right in real stitches and give people far more to choose from, including lace, doilies and full-piece layouts.

Added after the original plan, at the owner's request (November 2026). The owner reviewed every pattern in a swatchbook first.

## Owner decisions

| Topic | Decision |
| --- | --- |
| Why | The Phase 5 sprite motifs were resampled by fractions of a stitch, so shapes broke up (merged toes, fused clover, static-like yarn balls), and tall dc rows squashed them. |
| Redraws | Hearts, stars, paws, bones, fish, yarn balls, feathers, clover, carrots, horseshoes and scales are redrawn stitch by stitch. Leaves became **Vines**. Leopard follows real rosettes. |
| New | Classics, animal prints (leopard, jaguar, cheetah, giraffe, zebra, tiger, cow, **Speckles**), three quilt blocks (Ohio star, pinwheel, flying geese), folk and geometric (incl. a real hexagon **Honeycomb**). |
| Dropped from the proposal | Tossed hearts, the Kaleidoscope collection, Lace and doilies (filet lace, to revisit later), churn dash, log cabin, bear's paw, quilt sampler, terrazzo, and the quilt sampler blanket. |
| Layout | Borders (double line, Fair Isle band, scallops, Greek key) and frames round the pet (medallion ring, oval lace frame, sunburst), usable with any background. |
| Generated | Animal prints, Fair Isle maker and meander curves have a **Shuffle** button. |

## How it works

- `src/engine/patterns/core.ts` — helpers (hash, seeded random, noise), the redrawn sprites, the **art-pixel grid** (`artCell`: every drawing pixel is a whole number of stitches and rows, near-square — 1 × 1 in sc, 2 sts × 1 row in dc) and `makeRings`, the mandala/doily generator.
- `src/engine/patterns/library.ts` — `PATTERNS`: each is `art` (stitch-exact repeat), `inch` (organic print in inches; grows on dc and filet so spots stay thicker than a row, and tall stitches are sampled 2 × 3) or `radial` (centred design filling the piece; supported, but none in the picker yet).
- `src/engine/patterns/layout.ts` — borders and pet frames. Frames centre and size themselves on the pet's cells and clear the pattern round it.
- `src/engine/motifs.ts` — the picker list (`MOTIFS`, 12 collections), `motifTraits` (which controls apply), `backgroundInk`, and `decorationInk` (pattern → frame → border). The simple geometric motifs (dots, stripes, zigzag, checks, seeds, bubbles, waves) keep the Phase 5 inch-repeat engine and slider.
- Settings: `BackgroundPattern` gained `scale` (Small/Medium/Large), `seed`, `border`, `frame`. The Pattern page and PDF list them.
- Design step: a Collection menu picks which group of swatches shows; size, direction and Shuffle appear only when they apply.

## Tests

`tests/design.test.ts`: every pattern draws on sc, dc and filet; seeds change generated patterns and not fixed repeats; size steps are whole-stitch multiples; borders stay at the edge; frames never cover the pet; a border alone adds a decoration yarn.

## Handoff notes

- Not checked by eye inside the running app at phone width; the composition renders were checked from the engine directly.
- Patterns are centred on the piece, not on the pet.
- Filet lace (doilies, lace repeats) was drafted in the swatchbook and held back; `makeRings` and the `radial` kind are ready for it.
- Ideas the owner may ask for next: a frame subject picker (paws instead of hearts round the medallion), a second pattern yarn, saving favourite shuffles.
