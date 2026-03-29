import type { Stroke } from '../../types';
import type { AndGateElement } from './types';
import { generateId, IDENTITY_MATRIX } from '../../types/primitives';
import type { CreationContext, CreationResult } from '../registry/ElementPlugin';
import type { HandwritingRecognitionResult } from '../../recognition/RecognitionService';

export function canCreate(strokes: Stroke[]): boolean {
  return strokes.length >= 1 && strokes.length <= 2;
}

export async function createFromInk(
  strokes: Stroke[],
  context: CreationContext,
  recognitionResult?: HandwritingRecognitionResult
): Promise<CreationResult | null> {
  const element: CheckboxElement = {
    type: 'checkbox',
    id: generateId(),
    transform: IDENTITY_MATRIX,
    checked: false,
    sourceStrokes: strokes,
  };

  return {
    elements: [element],
    consumedStrokes: strokes,
    confidence: 0.85,
  };
}