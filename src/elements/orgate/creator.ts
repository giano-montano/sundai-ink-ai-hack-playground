import type { Stroke } from '../../types';
import type { HandwritingRecognitionResult } from '../../recognition/RecognitionService';
import type { CreationContext, CreationResult } from '../registry/ElementPlugin';
import { getStrokesBoundingBox } from '../registry/ElementRegistry';
import { analyzeOrGateBody } from './detection';
import { createOrGateElementFromBodyBounds } from './types';

export function canCreate(strokes: Stroke[]): boolean {
  if (strokes.length === 0 || strokes.length > 8) return false;
  const bounds = getStrokesBoundingBox(strokes);
  if (!bounds) return false;
  return bounds.right - bounds.left >= 36 && bounds.bottom - bounds.top >= 36;
}

export async function createFromInk(
  strokes: Stroke[],
  _context: CreationContext,
  _recognitionResult?: HandwritingRecognitionResult,
): Promise<CreationResult | null> {
  const detection = analyzeOrGateBody(strokes);
  if (!detection) return null;

  return {
    elements: [createOrGateElementFromBodyBounds(detection.bounds)],
    consumedStrokes: strokes,
    confidence:
      0.7 +
      detection.concavity * 0.18 +
      detection.symmetry * 0.05 +
      detection.tipCentered * 0.06 +
      Math.min(0.08, detection.leftWireCount * 0.02) +
      (detection.rightWireCount === 1 ? 0.05 : 0),
  };
}
