import type { Stroke, BoundingBox } from '../../types';
import type { InteractionResult } from '../registry/ElementPlugin';
import type { LogicInputElement } from './types';
import { boundingBoxesIntersect } from '../../types/primitives';

export function isInterestedIn(
  element: LogicInputElement,
  _strokes: Stroke[],
  strokeBounds: BoundingBox
): boolean {
  // Solo nos interesa si el trazo nuevo se dibuja ENCIMA del input
  return boundingBoxesIntersect(element.bounds, strokeBounds);
}

export async function acceptInk(
  element: LogicInputElement,
  strokes: Stroke[]
): Promise<InteractionResult> {
  // Gesto de toggle: 1 solo trazo que "tache" o "encierre"
  // Para una hackathon, vamos a ser generosos: cualquier interacción encima lo cambia.
  const newValue = element.value === 0 ? 1 : 0;
  
  const newElement: LogicInputElement = {
    ...element,
    value: newValue as 0 | 1,
  };

  return {
    element: newElement,
    consumed: true,
    strokesConsumed: strokes,
  };
}
