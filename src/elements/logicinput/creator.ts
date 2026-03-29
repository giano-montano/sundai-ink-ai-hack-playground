import type { Stroke } from '../../types';
import type { LogicInputElement } from './types';
import { generateId, IDENTITY_MATRIX } from '../../types/primitives';
import { getStrokesBoundingBox } from '../registry';
import type { CreationContext, CreationResult } from '../registry/ElementPlugin';
import type { HandwritingRecognitionResult } from '../../recognition/RecognitionService';

export function canCreate(strokes: Stroke[]): boolean {
  // Ahora aceptamos desde 1 solo trazo (el número solo) hasta 4 (un dibujo más complejo)
  return strokes.length >= 1 && strokes.length <= 4;
}

export async function createFromInk(
  strokes: Stroke[],
  _context: CreationContext,
  _recognitionResult?: HandwritingRecognitionResult
): Promise<CreationResult | null> {
  const bounds = getStrokesBoundingBox(strokes);
  if (!bounds) return null;

  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const aspectRatio = width / height;

  // Verificación geométrica simple (SIN OCR):
  // 1. ¿Parece un "1"? (Muy alto y estrecho)
  const isOneLike = aspectRatio < 0.4 && height > 15;
  
  // 2. ¿Parece un "0"? (Proporciones de círculo/cuadrado)
  const isZeroLike = aspectRatio >= 0.5 && aspectRatio <= 2.0 && width > 15 && height > 15;

  if (!isOneLike && !isZeroLike) return null;

  const value = isOneLike ? 1 : 0;

  // Creamos un área un poco más grande para el input final para que sea fácil de clicar
  const padding = 10;
  const finalBounds = {
    left: bounds.left - padding,
    top: bounds.top - padding,
    right: bounds.right + padding,
    bottom: bounds.bottom + padding
  };

  const element: LogicInputElement = {
    type: 'logicinput',
    id: generateId(),
    transform: IDENTITY_MATRIX,
    value,
    bounds: finalBounds,
    sourceStrokes: strokes,
  };

  return {
    elements: [element],
    consumedStrokes: strokes,
    confidence: 0.8, // Confianza media porque es heurística pura
  };
}
