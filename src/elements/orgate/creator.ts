import type { Stroke, BoundingBox } from '../../types';
import type { OrGateElement } from './types';
import type { LogicInputElement } from '../logicinput/types';
import { generateId, IDENTITY_MATRIX } from '../../types/primitives';
import { getStrokesBoundingBox } from '../registry';
import type { CreationContext, CreationResult } from '../registry/ElementPlugin';
import type { HandwritingRecognitionResult } from '../../recognition/RecognitionService';

export function canCreate(strokes: Stroke[]): boolean {
  // Similar a AND, pero podríamos buscar la palabra "OR" en el OCR
  return strokes.length >= 2 && strokes.length <= 6;
}

export async function createFromInk(
  strokes: Stroke[],
  _context: CreationContext,
  recognitionResult?: HandwritingRecognitionResult
): Promise<CreationResult | null> {
  const text = recognitionResult?.rawText?.toLowerCase() || '';
  const isOrText = text.includes('or');

  if (!isOrText && strokes.length < 3) return null;

  const totalBounds = getStrokesBoundingBox(strokes)!;
  const gateId = generateId();
  const outputId = generateId();

  const gate: OrGateElement = {
    type: 'orgate',
    id: gateId,
    transform: IDENTITY_MATRIX,
    bounds: totalBounds,
    sourceStrokes: strokes,
  };

  const outputWidth = 30;
  const outputHeight = 30;
  const outputPadding = 5;
  const outputBounds: BoundingBox = {
    left: totalBounds.right + outputPadding,
    top: totalBounds.top + (totalBounds.bottom - totalBounds.top) / 2 - outputHeight / 2,
    right: totalBounds.right + outputPadding + outputWidth,
    bottom: totalBounds.top + (totalBounds.bottom - totalBounds.top) / 2 + outputHeight / 2,
  };

  const outputInput: LogicInputElement = {
    type: 'logicinput',
    id: outputId,
    transform: IDENTITY_MATRIX,
    value: 0,
    bounds: outputBounds,
    outputOf: gateId,
  };

  return {
    elements: [gate, outputInput],
    consumedStrokes: strokes,
    confidence: isOrText ? 0.95 : 0.4, // Confianza baja si solo es por trazos para no pisar a la AND
  };
}
