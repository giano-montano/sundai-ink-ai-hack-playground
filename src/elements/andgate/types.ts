import type { BoundingBox, TransformableElement } from '../../types/primitives';
import type { Stroke } from '../../types/brush';

export interface AndGateElement extends TransformableElement {
  type: 'andgate';
  sourceStrokes?: Stroke[];
  bounds: BoundingBox;
  
  // Estado lógico (calculado por el simulador)
  input1?: 0 | 1 | null;
  input2?: 0 | 1 | null;
  output?: 0 | 1;
}
