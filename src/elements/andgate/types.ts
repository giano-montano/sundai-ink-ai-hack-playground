import type { BoundingBox, TransformableElement } from '../../types/primitives';
import type { Stroke } from '../../types/brush';

export interface AndGateElement extends TransformableElement {
  type: 'andgate';
  sourceStrokes?: Stroke[];
  bounds: BoundingBox;
}
