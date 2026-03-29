import type { BoundingBox, TransformableElement } from '../../types/primitives';
import type { Stroke } from '../../types/brush';

export interface OrGateElement extends TransformableElement {
  type: 'orgate';
  sourceStrokes?: Stroke[];
  bounds: BoundingBox;
  
  // Estado lógico
  input1?: 0 | 1 | null;
  input2?: 0 | 1 | null;
  output?: 0 | 1;
}
