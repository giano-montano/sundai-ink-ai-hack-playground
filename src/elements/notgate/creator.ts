import type { Stroke } from '../../types';
import type { HandwritingRecognitionResult } from '../../recognition/RecognitionService';
import type { CreationContext, CreationResult } from '../registry/ElementPlugin';
import { getStrokesBoundingBox } from '../registry/ElementRegistry';
import { detectNotGateBodyBounds } from './detection';
import { createNotGateElementFromBodyBounds } from './types';

export function canCreate(strokes: Stroke[]): boolean {
  if (strokes.length < 2 || strokes.length > 5) return false;
  const bounds = getStrokesBoundingBox(strokes);
  if (!bounds) return false;
  return bounds.right - bounds.left >= 36 && bounds.bottom - bounds.top >= 36;
}

export async function createFromInk(
  strokes: Stroke[],
  _context: CreationContext,
  _recognitionResult?: HandwritingRecognitionResult,
): Promise<CreationResult | null> {
  const bodyBounds = detectNotGateBodyBounds(strokes);
  if (!bodyBounds) return null;

  return {
    elements: [createNotGateElementFromBodyBounds(bodyBounds)],
    consumedStrokes: strokes,
    confidence: 0.86,
  };
}
