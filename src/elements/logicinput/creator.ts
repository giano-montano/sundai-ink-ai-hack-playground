import type { Stroke } from '../../types';
import type { LogicInputElement } from './types';
import { generateId, IDENTITY_MATRIX } from '../../types/primitives';
import { getStrokesBoundingBox } from '../registry';
import type { CreationContext, CreationResult } from '../registry/ElementPlugin';
import type { HandwritingRecognitionResult } from '../../recognition/RecognitionService';

export function canCreate(strokes: Stroke[]): boolean {
  // Necesitamos al menos 2 trazos (una caja y un número)
  return strokes.length >= 2 && strokes.length <= 6;
}

export async function createFromInk(
  strokes: Stroke[],
  _context: CreationContext,
  recognitionResult?: HandwritingRecognitionResult
): Promise<CreationResult | null> {
  if (!recognitionResult || !recognitionResult.rawText) return null;

  const text = recognitionResult.rawText.trim().toLowerCase();
  
  // Normalización de OCR común para 0 y 1
  let value: 0 | 1 | null = null;
  if (text === '0' || text === 'o' || text === 'zero') value = 0;
  if (text === '1' || text === 'i' || text === 'l' || text === 'one') value = 1;

  if (value === null) return null;

  const bounds = getStrokesBoundingBox(strokes);
  if (!bounds) return null;

  // Verificación geométrica básica
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  if (width < 10 || height < 10) return null;

  const element: LogicInputElement = {
    type: 'logicinput',
    id: generateId(),
    transform: IDENTITY_MATRIX,
    value,
    bounds,
    sourceStrokes: strokes,
  };

  return {
    elements: [element],
    consumedStrokes: strokes,
    confidence: 0.95,
  };
}
