import type { BoundingBox, Stroke } from '../../types';
import type { HandwritingRecognitionResult } from '../../recognition/RecognitionService';
import type { InteractionContext, InteractionResult } from '../registry/ElementPlugin';
import { acceptLogicGateInk, isInterestedInLogicGate } from '../logicgate/shared';
import type { NotGateElement } from './types';

export function isInterestedIn(
  element: NotGateElement,
  strokes: Stroke[],
  strokeBounds: BoundingBox,
): boolean {
  return isInterestedInLogicGate(element, strokes, strokeBounds);
}

export async function acceptInk(
  element: NotGateElement,
  strokes: Stroke[],
  recognitionResult?: HandwritingRecognitionResult,
  context?: InteractionContext,
): Promise<InteractionResult> {
  return acceptLogicGateInk(element, strokes, recognitionResult, context);
}
