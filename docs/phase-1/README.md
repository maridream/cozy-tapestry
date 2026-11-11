# Phase 1 — Cozy shell, wizard and photo upload

**Goal:** the app looks and feels like Cozy Tapestry. The user can switch themes, see the five steps, upload a photo and move between steps. Steps 2–5 are friendly placeholders.

**Read first:** [docs/README.md](../README.md), [ARCHITECTURE.md](../ARCHITECTURE.md).

**Depends on:** the scaffold. **Unblocks:** every later phase.

## What exists already

- `src/app/App.tsx` — a placeholder list of steps. Replace it.
- `src/config/steps.ts` — the five steps with titles and helper text. Use it; do not duplicate the list.
- `src/styles/theme.css` — color, type, spacing and radius tokens for both themes, including the `data-theme` override mechanism. Tune values if needed; keep variable names.
- `src/styles/base.css` — remove the `.scaffold*` rules when the placeholder goes.
- `src/types.ts`, `src/config/crochet.ts` — defaults for `PatternSettings` come from here.

## What the user sees

### Every screen

- **Header:** the name "Cozy Tapestry" in the heading font with a small yarn-ball mark (inline SVG, drawn by you — no external image), a one-line tagline ("Turn your pet into a crochet pattern"), and the **theme toggle** on the right.
- **Stepper:** the five step titles in a row with numbers. Current step highlighted; completed steps show a check and are clickable; later steps are greyed out and not clickable. On narrow screens it collapses to "Step 2 of 5 — Cutout" with a thin progress bar.
- **Step card:** a rounded card containing the step heading, its helper sentence (from `steps.ts`), the step's content, and a footer with **Back** (hidden on step 1) and **Next** (primary button; disabled with a short reason beside it when the step is not complete, e.g. "Add a photo to continue").
- **Footer:** "Your photo stays on your device." and a link to the GitHub repository (placeholder `#` until the owner provides the URL).

### Theme toggle

- First visit: follow the device (light → cottage, dark → fireside).
- The toggle is a single button showing a sun or a moon/fire icon with an accessible label ("Switch to fireside theme" / "Switch to cottage theme").
- Clicking sets `<html data-theme="cottage|fireside">` and saves the choice in `localStorage` under `cozy-theme`. A saved choice wins on later visits.
- Apply the saved theme **before first paint** (tiny inline script in `index.html`) so there is no flash.

### Look and feel

- Cottage: cream background, off-white cards, terracotta primary buttons, sage secondary accents. Fireside: deep brown background, slightly lighter cards, amber primary buttons.
- Headings in Fraunces, body in Nunito. Install them as self-hosted packages (`@fontsource-variable/fraunces`, `@fontsource-variable/nunito`) — no requests to Google Fonts. The token names in `theme.css` already expect these.
- Rounded corners, soft shadows, generous spacing. A very subtle knit/woven texture on the page background (CSS gradient or tiny inline SVG pattern; must look fine in both themes and must not hurt text contrast).
- Buttons and inputs have clear hover, focus and disabled states. Respect `prefers-reduced-motion` (no animation when set).

### Step 1 — Photo

- A large dashed drop zone: an illustration/icon, "Drop a photo of your pet here", and a **Choose a photo** button. The whole zone is clickable and keyboard-activatable. The file input uses `accept="image/*"`, so phones offer the camera or the photo library.
- Three short tips below: "One pet, clearly visible", "Good light, plain background if you can", "Face and body in frame".
- After a photo is chosen: show it (fit inside the card, max ~420 px tall), its file name, and a **Choose a different photo** link. **Next** becomes enabled.
- Problems are shown inline in the drop zone, in plain words:
  - not an image → "That file isn't a photo. Try a JPG or PNG."
  - cannot be decoded (commonly HEIC in Chrome/Firefox) → "We couldn't open that photo. If it came from an iPhone, try exporting it as a JPG first."
  - larger than 25 MB → "That photo is very large. Try one under 25 MB."

### Steps 2–5 (placeholders)

Each shows the step heading, helper text and a small "Coming soon" note inside the step card, so navigation can be tested end to end. For this phase only, allow Next on placeholder steps once a photo exists.

## Technical spec

### State — `src/app/state.tsx`

Implement the `AppState` from [ARCHITECTURE.md](../ARCHITECTURE.md) with a reducer and a context provider, plus a `useApp()` hook returning `{ state, dispatch }`.

Actions for this phase: `setPhoto(image, name)`, `clearPhoto`, `goToStep(id)`, `next`, `back`. Later phases add their own. `setPhoto` and `clearPhoto` reset `autoMask`, `mask`, `lockedPalette` and `pattern` to empty.

Default `settings`:

```ts
{
  technique: 'blanket-sc',
  yarnWeight: DEFAULT_YARN_WEIGHT,            // 'worsted'
  size: { width: 24, height: 36 },            // the 2×3 ft preset, portrait
  framing: { zoom: 1, offsetX: 0, offsetY: 0 },
  filetShowDetails: true,
  colorCount: COLOR_COUNT.default,            // 4
  backgroundHex: DEFAULT_BACKGROUND_HEX,
  smoothing: 1,
  yardsPerSkein: DEFAULT_YARDS_PER_SKEIN.worsted,
}
```

Put step-completion logic in one function, `isStepComplete(state, stepId)`, used by both the stepper and the Next button.

### Photo loading — `src/steps/upload/loadPhoto.ts`

`loadPhoto(file: File): Promise<ImageData>`:

1. Reject non-`image/*` types and files over 25 MB with typed errors the UI maps to the messages above.
2. Decode with `createImageBitmap(file, { imageOrientation: 'from-image' })` so phone photos are upright. Decode failure → the "couldn't open" error.
3. Downscale so the longest side is at most **2048 px** (never upscale), draw to a canvas, return `getImageData`.
4. Flatten transparency onto white.

Show the photo in the UI by drawing the `ImageData` to a `<canvas>` (or an object URL of the original file — remember to revoke it).

### Components

Create small reusable pieces in `src/components/` that later phases will need: `Button` (primary / secondary / quiet), `Card`, `Segmented` (radio-group styled as joined buttons), `Slider` (labelled range input showing its value), `Field` (label + hint + error wrapper). Keep them thin wrappers over native elements.

Suggested files in `src/app/`: `App.tsx`, `state.tsx`, `Header.tsx`, `ThemeToggle.tsx`, `Stepper.tsx`, `StepLayout.tsx`, each with a matching `.css`.

Update `index.html`: favicon (inline SVG data URL of the yarn-ball mark), `theme-color` meta, the pre-paint theme script.

## Tests

- `tests/state.test.ts`: reducer — `setPhoto` enables step 2 and clears downstream data; `next`/`back` stay within bounds; `goToStep` refuses a step beyond the first incomplete one.
- Keep `tests/config.test.ts` passing.

## Out of scope

Background removal, any pattern settings UI, anything on steps 2–5 beyond placeholders, PDF, deployment.

## Acceptance checklist

- [ ] `npm run dev` shows the header, stepper and upload step in the cottage theme on a light-mode device and fireside on a dark-mode device.
- [ ] The toggle switches themes instantly, survives a reload, and there is no flash of the wrong theme on load.
- [ ] Drag-and-drop and the button both load a photo; a phone-rotated photo shows upright.
- [ ] A `.txt` file and a too-large file each show their friendly message; the app stays usable.
- [ ] Next/Back and the stepper move between steps; steps beyond the photo are blocked until a photo exists.
- [ ] Everything is usable with the keyboard alone; focus is always visible.
- [ ] At 360 px wide nothing overflows horizontally and the stepper is in its compact form.
- [ ] Text contrast passes WCAG AA in both themes.
- [ ] `npm run typecheck`, `npm test`, `npm run build` pass.

## Handoff notes

_(Worker: record anything Phase 2 needs to know — component names, deviations, font package versions.)_
