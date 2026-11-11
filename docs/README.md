# Cozy Tapestry — project plan

Cozy Tapestry is a website where a pet owner uploads a photo and gets a crochet pattern for a tapestry or blanket of their pet: a simplified picture (solid colors, not every shade of fur), a yarn list with amounts, row-by-row instructions, and a printable PDF.

This folder is the complete plan. Each phase is written so that a worker who has **not** seen the planning conversation can build it from the docs alone.

## How to use these docs (workers, read this first)

1. Read this file, then [ARCHITECTURE.md](ARCHITECTURE.md), then your phase's `README.md`.
2. Build only your phase. Do not start work that belongs to a later phase; if you need something from one, stub it.
3. The decisions in the table below were made by the project owner. Do not change them. If something user-visible is not covered by the docs, **ask the owner** rather than guessing. Code-level choices (file names inside your phase, helper functions, CSS details) are yours.
4. Before you finish: `npm run typecheck`, `npm test` and `npm run build` must pass, and you must have clicked through your phase's acceptance checklist in a real browser (`npm run dev`).
5. Finish by ticking your phase in the status table below, adding anything the next phase needs to know under "Handoff notes" in your phase doc, and committing (`git commit`) with a message starting `Phase N:`.
6. Library names in these docs are recommendations made from memory at planning time (November 2026). Check each library's current docs, API and **license** before installing; if a recommendation no longer holds, pick the closest equivalent and record why in your handoff notes.

## Phases

| Phase | What it delivers | Doc | Done |
| --- | --- | --- | --- |
| 0 | Git repository, GitHub remote, first push | [phase-0](phase-0/README.md) | ☑ |
| 1 | Cozy app shell: themes, step-by-step wizard, photo upload | [phase-1](phase-1/README.md) | ☑ |
| 2 | Automatic pet cutout + touch-up brush | [phase-2](phase-2/README.md) | ☐ |
| 3 | Pattern engine + "Type & size" and "Colors" steps | [phase-3](phase-3/README.md) | ☐ |
| 4 | Pattern page, PDF export, polish, publish to GitHub Pages | [phase-4](phase-4/README.md) | ☐ |

Phases must be done in order: each one depends on the one before.

Already done by the planner (the scaffold): Vite + React + TypeScript project, test runner, shared types (`src/types.ts`), crochet reference numbers (`src/config/crochet.ts`), wizard step list (`src/config/steps.ts`), theme color tokens (`src/styles/theme.css`), and stub files with function signatures for every engine/segmentation/export module. `npm run dev`, `npm test`, and `npm run typecheck` all work.

## Owner decisions (fixed)

| Topic | Decision |
| --- | --- |
| Name | **Cozy Tapestry** (repo name `cozy-tapestry`) |
| License | **AGPL-3.0-or-later** (`LICENSE`), chosen so the plan's preferred background-removal library (`@imgly/background-removal`, AGPL) can be used. Dependencies and models must be AGPL-compatible (MIT, Apache-2.0, BSD, GPL-3.0, AGPL-3.0 are fine; no non-commercial licenses). The footer link to the GitHub source must stay — AGPL requires offering the source to people who use the site. |
| Form | A website. Runs entirely in the browser; photos are never uploaded to a server. Hosted free on GitHub Pages. |
| Audience | Pet owners who crochet; not technical. The app must be simple. |
| Flow | Step-by-step wizard, one thing per screen, Back/Next: **Photo → Cutout → Type & size → Colors → Pattern** |
| Subject | Background is removed automatically; the user can fix the cutout with a keep/erase brush and choose a solid background color. |
| Simplification | The pet is reduced to a few solid colors (not every tone). Small features like eyes survive only if they are big enough at the chosen size. |
| Piece types | **Thick blanket** (tapestry single crochet) or **Decorative tapestry**, which has two styles: **full color** (double crochet colorwork) and **filet mesh** (one color, open/filled squares). |
| Sizes | Preset buttons 1×1, 2×2, 2×3, 3×4, 4×5, 5×8 ft, a portrait/landscape toggle, and a custom width/height (short side up to 5 ft, long side up to 8 ft). |
| Yarn weight | User picks DK, worsted (default) or bulky; hook size, stitch counts and yardage follow. |
| Colors | Slider for number of colors (2–8, including background). The app picks colors from the photo and gives them plain names ("warm brown"). The user can click any color to change it to match yarn they own. |
| Yarn estimate | Per color: yards, meters, and skeins to buy, with about 10% extra included. |
| Pattern output | Written rows in the form `12 dc green, 5 dc white` per row; an on-screen preview; a **printable PDF** containing the yarn list, a numbered grid chart, and the written rows. |
| Theme | Cozy. Two looks: **warm cottage** (cream, terracotta, sage) and **fireside** (dark brown, amber). Follows the device's light/dark setting, with a toggle to switch. |

## Planner assumptions, confirmed by the owner

These are small user-visible choices the planner filled in. The owner confirmed all of them on 2026-11-11, so they are fixed like the decisions above.

1. Patterns use **US crochet terms** (sc, dc) and say so on the PDF.
2. Written rows assume a **right-handed** crocheter working turned rows from the bottom up (odd rows read right-to-left on the chart). No left-handed mode in v1.
3. The "Type & size" step lets the user **drag and zoom the pet** inside the piece.
4. The "Colors" step has a **Detail** control (Crisp / Balanced / Smooth) that removes stray single stitches.
5. PDF paper size is selectable: **US Letter** (default) or A4.
6. Nothing is saved between visits except the theme choice; reloading the page starts over.
7. No row tracker (the owner did not select it).

## Glossary

| Term | Meaning |
| --- | --- |
| sc / dc / ch | Single crochet / double crochet / chain (US terms) |
| Tapestry crochet | Colorwork where unused yarn colors are carried inside the stitches |
| Filet crochet | A mesh of open squares and filled squares that forms a picture in one color |
| Gauge | Stitches and rows per inch for a given yarn, hook and stitch |
| Cell | One square of the chart: one stitch (sc/dc) or one mesh square (filet, 2 stitches wide) |
| Cutout | The photo plus a mask saying which pixels are the pet |
| RS / WS | Right side / wrong side of the fabric |
