import type { AndGateElement } from "./types";
import type { Stroke } from '../../types';
import type { BoundingBox } from '../../types/primitives';
import type { InteractionResult } from '../registry/ElementPlugin';

export function isInterestedIn(
  element: AndGateElement,
  _strokes: Stroke[],
  strokeBounds: BoundingBox
): boolean {
    return true;
}
