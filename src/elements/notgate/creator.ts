import type { Stroke } from '../../types';
import type { NotGateElement } from './types';
import type { LogicInputElement } from '../logicinput/types';
import { generateId, IDENTITY_MATRIX } from '../../types/primitives';
import { getStrokesBoundingBox } from '../registry';
import type { CreationContext, CreationResult } from '../registry/ElementPlugin';
import type { HandwritingRecognitionResult } from '../../recognition/RecognitionService';

export function canCreate(strokes: Stroke[]): boolean {
  // Cuerpo (Triángulo) + 1 entrada + 1 salida = 3 idealmente
  return strokes.length >= 2 && strokes.length <= 4;
}

export async function createFromInk(
  strokes: Stroke[],
  _context: CreationContext,
  recognitionResult?: HandwritingRecognitionResult
): Promise<CreationResult | null> {
  const strokeData = strokes.map(s => {
    const b = getStrokesBoundingBox([s])!;
    return {
      bounds: b,
      width: b.right - b.left,
      height: b.bottom - b.top,
      centerX: (b.left + b.right) / 2,
      isHorizontal: (b.right - b.left) > (b.bottom - b.top) * 1.5,
      area: (b.right - b.left) * (b.bottom - b.top)
    };
  });

  const body = strokeData.sort((a, b) => b.area - a.area)[0];
  const others = strokeData.filter(s => s !== body);

  // NOT gate: 1 entrada (izquierda) y 1 salida (derecha)
  const inputs = others.filter(o => o.centerX < body.centerX && o.isHorizontal);
  const outputs = others.filter(o => o.centerX > body.centerX && o.isHorizontal);

  // VALIDACIÓN ESTRICTA: NOT solo puede tener 1 entrada
  if (inputs.length !== 1 || outputs.length !== 1) return null;

  const text = recognitionResult?.rawText?.toLowerCase() || '';
  const isNotText = text.includes('not') || text === '!';
  const totalBounds = getStrokesBoundingBox(strokes)!;

  const gateId = generateId();
  return {
    elements: [
      {
        type: 'notgate',
        id: gateId,
        transform: IDENTITY_MATRIX,
        bounds: totalBounds,
        sourceStrokes: strokes,
      },
      {
        type: 'logicinput',
        id: generateId(),
        transform: IDENTITY_MATRIX,
        value: 0,
        bounds: {
          left: totalBounds.right + 5,
          top: totalBounds.top + (totalBounds.bottom - totalBounds.top) / 2 - 15,
          right: totalBounds.right + 35,
          bottom: totalBounds.top + (totalBounds.bottom - totalBounds.top) / 2 + 15,
        },
        outputOf: gateId,
      }
    ],
    consumedStrokes: strokes,
    confidence: isNotText ? 0.95 : 0.85, // Prioridad alta si cumple la topología de 1 entrada
  };
}
