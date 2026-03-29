import type { BoundingBox, TransformableElement } from '../../types/primitives';
import type { Stroke } from '../../types/brush';

export interface LogicInputElement extends TransformableElement {
  type: 'logicinput';
  value: 0 | 1;
  bounds: BoundingBox;
  sourceStrokes?: Stroke[];
  outputOf?: string; // ID of the gate that owns this output
}
