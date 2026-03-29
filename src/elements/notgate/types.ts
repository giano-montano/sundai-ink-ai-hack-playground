import type { BoundingBox, TransformableElement } from '../../types/primitives';
import type { Stroke } from '../../types/brush';

export interface NotGateElement extends TransformableElement {
  type: 'notgate';
  sourceStrokes?: Stroke[];
  bounds: BoundingBox;
  
  // Estado lógico (1 entrada solamente)
  input?: 0 | 1 | null;
  output?: 0 | 1;
}
