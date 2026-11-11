# Phase 4 — Pattern page, printable PDF, polish and publishing

**Goal:** the final step shows the finished pattern — preview, yarn shopping list, written rows — and downloads a printable PDF. The app is polished end to end and published on GitHub Pages so anyone can use it from a link.

**Read first:** [docs/README.md](../README.md), [ARCHITECTURE.md](../ARCHITECTURE.md), Phase 3 handoff notes.

**Depends on:** Phase 3 (`state.pattern`, `renderPreview`, `renderPreviewToBlob`). **Unblocks:** release.

Build order: **A. Pattern step → B. PDF → C. polish pass → D. publish.**

---

## A. Step 5 — "Pattern"

Everything here is read from `state.pattern`; this step computes nothing except re-estimating yarn when "yards per skein" changes.

Sections, top to bottom:

### 1. Summary card

- The stitch preview (`renderPreview`), large.
- Facts beside/below it:
  - **Type:** e.g. "Thick blanket (single crochet)"
  - **Finished size:** "about 24 × 36 in (61 × 91 cm)"
  - **Chart:** "96 stitches × 162 rows" (filet: "42 squares × 68 rows")
  - **Yarn:** "Worsted / medium (#4)"
  - **Hook:** "5 mm (H-8)"
  - **Gauge:** "16 sc × 18 rows = 4 in" (derive from the gauge × 4; filet: "7 squares × 7.6 rows = 4 in", one decimal)
  - **Start:** "Chain 97" (`foundationChain`)
- A quiet note: "Sizes and yarn amounts are estimates. Make a small swatch first — if it's bigger or smaller than the gauge, change hook size."

### 2. Yarn shopping list

A table, one row per color in `estimate.lines`:

| Swatch | Color | Yards | Meters | Skeins |
| --- | --- | --- | --- | --- |

- Yards and meters rounded up to whole numbers. Total row at the bottom.
- A **Yards per skein** number field (prefilled from settings, 20–2000). Changing it updates skeins immediately (`estimateYarn` again or just recompute `ceil`).
- Note: "Includes about 10% extra." For the blanket also: "Colors are carried inside the stitches, which is counted here."

### 3. Written rows

- Heading "Row by row" with a one-paragraph "How to read this" box:
  - sc: "Work from the bottom up. Chain 97. Row 1: sc in the 2nd chain from the hook and in each chain across, changing colors as listed. Chain 1 and turn at the end of every row. Odd rows are the right side."
  - dc: same pattern with "dc in the 3rd chain from the hook… Chain 2 and turn (does not count as a stitch)."
  - filet: "Each square is 2 stitches. **Open** = chain 1, skip 1, dc in the next stitch. **Filled** = dc in the next 2 stitches. Chain 3 at the start of each row (counts as the first dc)."
  - All: "Change color on the last pull-through of the stitch before the new color." (not shown for filet) and "US crochet terms."
- The rows as a list, exactly the owner's requested form: `Row 12 (WS): 14 sc cream, 6 sc warm brown, 20 sc cream`. Show a tiny color dot before each color name. Monospace-ish alignment is not needed; readability is.
- Long patterns (up to 528 rows): render in chunks of 50 with a "Show more rows" button, or a "Jump to row" field — do not render 500+ rows at once on phones.
- A **Copy all rows** button (plain text to clipboard).

### 4. Actions

- **Download PDF** (primary). Shows "Preparing your PDF…" while working; then triggers a download named `cozy-tapestry-<photo-name>-<width>x<height>in.pdf`.
- **Paper size** select next to it: US Letter (default) / A4.
- **Make another** — confirms, then clears state and returns to step 1.

There is no Next button on this step; Back works as usual.

---

## B. PDF — `src/export/pdf.ts`

`exportPatternPdf(pattern, previewPng, options?: { paper: 'letter' | 'a4'; title?: string }): Promise<Blob>`

Use `jspdf` (check its current docs and license), loaded with dynamic `import()` so it is a separate chunk. Use the PDF's built-in fonts (Helvetica) — do not embed web fonts. Portrait pages, 0.5 in margins. Every page has a footer: "Cozy Tapestry — page N of M".

The PDF must be readable when printed in **black and white**: every color is also identified by a **letter symbol** (A, B, C… in palette order; background = A).

### Page 1 — Cover and shopping list

- Title "Cozy Tapestry pattern" and the photo name.
- The preview image (`previewPng`), up to ~4.5 in wide.
- The facts from the summary card (type, finished size, chart size, yarn weight, hook, gauge, starting chain).
- Yarn table: symbol letter, color swatch (filled rectangle), name, yards, meters, skeins; totals.
- Notes: estimates/swatch reminder; "US crochet terms"; abbreviations used (ch, sc, dc, RS, WS).
- The same "How to read this" text as the Pattern step.

### Chart pages

A numbered grid chart of the whole piece, split across pages.

- Each cell is drawn in its yarn color with its symbol letter centred in it (dark or light text chosen for contrast). Filet: filled = solid dark square, open = empty square; no letters.
- Cells keep the true proportions `cellWidthIn : cellHeightIn` (dc cells are tall).
- Cell width on paper about 0.14–0.16 in for square-ish cells → about **50 columns per page**; rows per page = whatever fits the page height at that scale. Compute both from the page size; do not hard-code.
- Thin lines between cells, **heavier lines every 10** rows and columns.
- **Row numbers** on both sides (crochet numbering: 1 at the bottom) and **column numbers** along the bottom, every 10.
- Each chart page is headed "Chart — columns 51–100, rows 71–140 (page 3 of 12)".
- Page order: bottom-left section first (where crocheting starts), moving left to right, then up.
- Before the first chart page, when there is more than one, include a small **overview map**: the preview image with the page tiles outlined and numbered.
- Small arrows or a line of text: "Odd rows (RS) are worked right to left; even rows (WS) left to right."

Largest case: 300 × 528 cells ≈ 6 × 8 = ~48 chart pages. That is acceptable; make sure generation stays under ~10 s and the UI shows progress.

### Written rows pages

- Heading "Row by row".
- One line per row, wrapped with a hanging indent; each color written as `count stitch name` — the same text as on screen. About 45–55 lines per page.
- A checkbox square (☐ drawn as a small rectangle) before each row so people can tick rows off on paper.

### Tests

`tests/pdfLayout.test.ts`: put the page-tiling maths in a pure helper (`planChartPages(cols, rows, cellAspect, paper)`) and test it: every cell is covered exactly once; tile ranges are contiguous; the 300 × 528 case yields a sensible page count; a 15 × 17 chart is a single page. The actual PDF bytes are verified by hand (open it, print one page).

---

## C. Polish pass (whole app)

- **Empty/edge states:** arriving at any step without its inputs redirects to the earliest incomplete step.
- **Leaving:** warn before unload (`beforeunload`) once a photo is loaded, since nothing is saved.
- **Copy review:** read every screen aloud; remove jargon; consistent names ("Thick blanket", "Decorative tapestry", "Full color", "Filet mesh") everywhere including the PDF.
- **Accessibility audit:** keyboard walk-through of all five steps; screen-reader labels on icon buttons, sliders and swatches; live region announcing "Pattern updated"; contrast in both themes; reduced motion.
- **Responsive audit:** 360 px, 768 px, 1280 px.
- **Browser check:** current Chrome, Safari, Firefox; iOS Safari for upload + brush + PDF download.
- **Performance:** confirm lazy chunks (segmentation, PDF); main bundle size noted in handoff.
- **Page metadata:** title, description, social preview image (a generated screenshot), favicon.
- **Root README:** replace the "Status: scaffold" note with a short description, a screenshot, the live link, how it works, privacy statement, credits and licenses of third-party libraries/models, and "estimates only" disclaimer.

## D. Publish to GitHub Pages

1. Add `.github/workflows/deploy.yml`: on push to `main` — checkout, set up Node (LTS), `npm ci`, `npm test`, `npm run build`, upload `dist/` as the Pages artifact, deploy with the official Pages actions. Use the **current major versions** of `actions/checkout`, `actions/setup-node`, `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages` (look them up; do not copy version numbers from memory). The workflow needs `permissions: pages: write, id-token: write, contents: read`.
2. `vite.config.ts` already uses `base: './'`, so no repo-name configuration is needed. Verify the built site works from a sub-path with `npm run build && npm run preview`.
3. **Owner action (cannot be done by a worker):** on GitHub open the repository → **Settings → Pages → Build and deployment → Source: GitHub Actions**. Then push. The site appears at `https://YOUR-USERNAME.github.io/cozy-tapestry/` after the workflow finishes (Actions tab shows progress).
4. Put the live link in the README and in the app footer's GitHub link.

If the background-removal model is loaded from a third-party CDN, test the published site (not just localhost) to confirm it loads there.

## Out of scope (ideas for later, not v1)

Row tracker, saving projects between visits, left-handed mode, matching real yarn brands, UK terms, sharing patterns by link, multiple pets.

## Acceptance checklist

- [ ] Pattern step shows preview, facts, yarn table with skeins, and written rows in the form `12 dc green, 5 dc white`.
- [ ] Changing yards per skein updates skein counts.
- [ ] Download PDF produces a file that opens in Preview/Acrobat/Chrome with: cover + yarn list, overview map, chart pages with numbering and heavier lines every 10, written rows with tick boxes, page numbers.
- [ ] A chart page printed in black and white is still usable (letters legible).
- [ ] PDFs verified for all three techniques, for the smallest (1×1 ft) and largest (5×8 ft) sizes, in Letter and A4.
- [ ] Row 1 in the written rows matches the bottom chart row read right to left (spot-check three rows against the chart).
- [ ] Make another returns to a clean step 1.
- [ ] Full keyboard walk-through passes; both themes pass contrast; 360 px layout holds.
- [ ] The GitHub Actions deploy succeeds and the live site works end to end, including the cutout model.
- [ ] `npm run typecheck`, `npm test`, `npm run build` pass; all phases ticked in docs/README.md.

## Handoff notes

_(Worker: live URL, bundle sizes, known limitations, anything left for a future version.)_
