import type { BoundingBox, Stroke } from '../../types';
import type { HandwritingRecognitionResult } from '../../recognition/RecognitionService';
import type { InteractionContext, InteractionResult } from '../registry/ElementPlugin';
import { acceptLogicGateInk, isInterestedInLogicGate } from '../logicgate/shared';
import type { OrGateElement } from './types';

export function isInterestedIn(
  element: OrGateElement,
  strokes: Stroke[],
  strokeBounds: BoundingBox,
): boolean {
  return isInterestedInLogicGate(element, strokes, strokeBounds);
}

export async function acceptInk(
  element: OrGateElement,
  strokes: Stroke[],
  recognitionResult?: HandwritingRecognitionResult,
  context?: InteractionContext,
): Promise<InteractionResult> {
  return acceptLogicGateInk(element, strokes, recognitionResult, context);
}
