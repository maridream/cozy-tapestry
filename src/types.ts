/**
 * Shared data contracts for Cozy Tapestry.
 *
 * These types are the agreement between phases. Phase workers may ADD fields,
 * but should not rename or change the meaning of existing ones without
 * updating docs/ARCHITECTURE.md and every phase doc that mentions them.
 */

// ---------------------------------------------------------------- wizard ---

export type WizardStepId = 'upload' | 'cutout' | 'setup' | 'colors' | 'pattern';

// ------------------------------------------------------------- technique ---

/**
 * How the piece is crocheted.
 * - `blanket-sc`  Thick blanket: tapestry single crochet, unused colors carried
 *                 inside the stitches. Dense, no holes, most yarn.
 * - `decor-dc`    Decorative tapestry, full color: double crochet colorwork.
 *                 Looser, drapier, small gaps, less yarn.
 * - `decor-filet` Decorative tapestry, filet mesh: one yarn color; the picture
 *                 is made of filled blocks vs open mesh squares. Least yarn.
 */
export type Technique = 'blanket-sc' | 'decor-dc' | 'decor-filet';

export type YarnWeight = 'dk' | 'worsted' | 'bulky';

/** A stitch token as it appears in written rows. */
export type StitchKind = 'sc' | 'dc' | 'open' | 'filled';

// ------------------------------------------------------------------ size ---

export interface SizeInches {
  width: number;
  height: number;
}

export interface SizePreset {
  id: string;
  /** e.g. "2 × 3 ft" */
  label: string;
  /** Stored portrait-or-square (short side first); orientation toggle swaps. */
  shortFt: number;
  longFt: number;
}

export type Orientation = 'portrait' | 'landscape';

// ----------------------------------------------------------------- gauge ---

export interface Gauge {
  /** Grid cells per inch across a row. For filet a cell is one mesh square (2 stitches). */
  cellsPerInch: number;
  /** Rows per inch. */
  rowsPerInch: number;
  /** Suggested hook. */
  hookMm: number;
  hookUs: string;
}

/** The stitch grid a finished piece of a given size works out to. */
export interface GridSpec {
  cols: number;
  rows: number;
  /** Physical size of one cell; cells are NOT square for dc. */
  cellWidthIn: number;
  cellHeightIn: number;
  /** Actual finished size after rounding to whole cells. */
  finished: SizeInches;
}

// ---------------------------------------------------------------- colors ---

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface YarnColor {
  /** Stable id, e.g. "c0". Index in the palette array is what cells store. */
  id: string;
  /** Plain-language name, e.g. "warm brown". Editable by the user. */
  name: string;
  /** "#rrggbb" */
  hex: string;
  /** Exactly one palette entry is the background. */
  role: 'background' | 'subject';
  /** True once the user has hand-picked this color; auto-pick must not overwrite it. */
  userEdited: boolean;
  /** The color the app picked from the photo, before any user edit. Used to re-attach edits after a rebuild. */
  autoHex: string;
}

// ----------------------------------------------------------------- image ---

/**
 * The photo after Phase 2: original pixels plus a subject mask.
 * `mask` has one byte per pixel (0 = background, 255 = subject), same
 * dimensions as `image`. Soft edges (1–254) are allowed.
 */
export interface CutoutImage {
  image: ImageData;
  mask: Uint8ClampedArray;
}

// --------------------------------------------------------------- pattern ---

/**
 * The stitch chart. `cells[row * cols + col]` is a palette index.
 * Row 0 is the TOP of the picture as displayed; crochet row 1 is the BOTTOM
 * row (index rows-1). See docs/ARCHITECTURE.md "Row order".
 * For `decor-filet` the palette has exactly 2 entries: index 0 = open mesh
 * (background), index 1 = filled block.
 */
export interface PatternGrid {
  cols: number;
  rows: number;
  cells: Uint8Array;
  palette: YarnColor[];
}

export interface RowRun {
  count: number;
  stitch: StitchKind;
  /** Palette index. For filet: 0 for open, 1 for filled. */
  colorIndex: number;
}

export interface WrittenRow {
  /** 1-based crochet row number (row 1 = bottom of the picture). */
  rowNumber: number;
  /** Right side / wrong side of the fabric. Odd rows are RS. */
  side: 'RS' | 'WS';
  /** Runs in the order they are worked. */
  runs: RowRun[];
  /** e.g. "Row 12 (WS): 14 sc cream, 6 sc warm brown, 20 sc cream" */
  text: string;
}

export interface YarnEstimateLine {
  colorIndex: number;
  yards: number;
  meters: number;
  /** Whole skeins to buy, rounded up. */
  skeins: number;
}

export interface YarnEstimate {
  lines: YarnEstimateLine[];
  totalYards: number;
  totalMeters: number;
  /** Buffer already included in every number above, e.g. 0.1 for 10%. */
  bufferFraction: number;
  yardsPerSkein: number;
}

/**
 * Where the pet sits inside the piece (set by drag + zoom in "Type & size").
 * Defaults { zoom: 1, offsetX: 0, offsetY: 0 } = subject's bounding box
 * centred and scaled to fill the piece minus an 8% margin on each side.
 */
export interface Framing {
  /** 0.5–2. Multiplies the default fit scale. */
  zoom: number;
  /** Shift of the subject centre from the piece centre, as a fraction of piece width / height. */
  offsetX: number;
  offsetY: number;
}

/** Everything the user chose in the "Type & size" and "Colors" steps. */
export interface PatternSettings {
  technique: Technique;
  yarnWeight: YarnWeight;
  size: SizeInches;
  framing: Framing;
  /** Filet only: show dark features inside the pet (eyes, nose) as open squares. */
  filetShowDetails: boolean;
  /** 2–8, includes the background color. Ignored for filet (always 1 yarn). */
  colorCount: number;
  backgroundHex: string;
  /** 0 = keep every speck, 1 = default, 2 = extra smooth. */
  smoothing: 0 | 1 | 2;
  yardsPerSkein: number;
}

/** The finished, fully derived pattern shown in the last step and exported to PDF. */
export interface Pattern {
  settings: PatternSettings;
  gauge: Gauge;
  gridSpec: GridSpec;
  grid: PatternGrid;
  rows: WrittenRow[];
  /** Number of chains in the foundation chain, including turning chains. */
  foundationChain: number;
  estimate: YarnEstimate;
}
