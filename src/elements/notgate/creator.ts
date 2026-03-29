import type { Stroke, BoundingBox } from '../../types';
import type { NotGateElement } from './types';
import type { LogicInputElement } from '../logicinput/types';
import { generateId, IDENTITY_MATRIX } from '../../types/primitives';
import { getStrokesBoundingBox } from '../registry';
import type { CreationContext, CreationResult } from '../registry/ElementPlugin';
import type { HandwritingRecognitionResult } from '../../recognition/RecognitionService';

export function canCreate(strokes: Stroke[]): boolean {
  return strokes.length >= 2 && strokes.length <= 5;
}

export async function createFromInk(
  strokes: Stroke[],
  _context: CreationContext,
  recognitionResult?: HandwritingRecognitionResult
): Promise<CreationResult | null> {
  const text = recognitionResult?.rawText?.toLowerCase() || '';
  const isNotText = text.includes('not') || text === '!';

  const totalBounds = getStrokesBoundingBox(strokes)!;
  const gateId = generateId();
  const outputId = generateId();

  const gate: NotGateElement = {
    type: 'notgate',
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
    confidence: isNotText ? 0.95 : 0.4,
  };
}
