import type { TransformableElement } from '../../types/primitives';
import type { Stroke } from '../../types/brush';
import type { BoundingBox } from '../../types/primitives';

export interface AndGateElement extends TransformableElement {
  type: 'andgate';

  bodyStrokes: Stroke[];   // shape of the gate
  inputWires: Stroke[];    // left lines
  outputWire: Stroke[];    // right line

  bounds: BoundingBox;
}