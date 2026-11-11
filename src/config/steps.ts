import type { WizardStepId } from '../types';

export interface WizardStepInfo {
  id: WizardStepId;
  /** Short label shown in the stepper. */
  title: string;
  /** One-line helper text shown under the step heading. */
  summary: string;
  /** Which docs/phase-N builds this step's screen. */
  phase: number;
}

/** The wizard, in order. The order here is the order of the Back/Next flow. */
export const WIZARD_STEPS: readonly WizardStepInfo[] = [
  { id: 'upload', title: 'Photo', summary: 'Upload a photo of your pet.', phase: 1 },
  { id: 'cutout', title: 'Cutout', summary: 'Check the cutout and tidy it with the brush.', phase: 2 },
  { id: 'setup', title: 'Type & size', summary: 'Blanket or decorative tapestry, yarn weight and size.', phase: 3 },
  { id: 'design', title: 'Design', summary: 'Place your pet, add a patterned background and text.', phase: 5 },
  { id: 'colors', title: 'Colors', summary: 'Choose how many colors and swap any you like.', phase: 3 },
  { id: 'pattern', title: 'Pattern', summary: 'Yarn list, written rows and a printable PDF.', phase: 4 },
];
