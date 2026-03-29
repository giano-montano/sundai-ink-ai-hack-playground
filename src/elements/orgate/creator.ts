import type { Stroke } from '../../types';
import type { OrGateElement } from './types';
import type { LogicInputElement } from '../logicinput/types';
import { generateId, IDENTITY_MATRIX } from '../../types/primitives';
import { getStrokesBoundingBox } from '../registry';
import type { CreationContext, CreationResult } from '../registry/ElementPlugin';
import type { HandwritingRecognitionResult } from '../../recognition/RecognitionService';

export function canCreate(strokes: Stroke[]): boolean {
  // Cuerpo + 2 entradas + 1 salida = 4 idealmente
  return strokes.length >= 3 && strokes.length <= 6;
}

export async function createFromInk(
  strokes: Stroke[],
  _context: CreationContext,
  recognitionResult?: HandwritingRecognitionResult
): Promise<CreationResult | null> {
  const strokeData = strokes.map(s => {
    const b = getStrokesBoundingBox([s])!;
    const area = (b.right - b.left) * (b.bottom - b.top);
    
    // Calcular área del polígono del trazo
    const points = s.inputs.inputs;
    let actualArea = 0;
    if (points.length > 2) {
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        actualArea += (p1.x * p2.y) - (p2.x * p1.y);
      }
      actualArea = Math.abs(actualArea) / 2;
    }

    return {
      bounds: b,
      width: b.right - b.left,
      height: b.bottom - b.top,
      centerX: (b.left + b.right) / 2,
      isHorizontal: (b.right - b.left) > (b.bottom - b.top) * 1.5,
      area,
      actualArea,
      areaRatio: actualArea / (area || 1)
    };
  });

  const body = strokeData.sort((a, b) => b.area - a.area)[0];
  const others = strokeData.filter(s => s !== body);

  const inputs = others.filter(o => o.centerX < body.centerX && o.isHorizontal);
  const outputs = others.filter(o => o.centerX > body.centerX && o.isHorizontal);

  // OR requiere 2 entradas y 1 salida (según la nueva convención de triángulo con 2 rayas)
  if (inputs.length !== 2 || outputs.length !== 1) return null;

  const text = recognitionResult?.rawText?.toLowerCase() || '';
  const isOrText = text.includes('or');
  
  // Si el cuerpo es más parecido a un triángulo (ratio de área cercano a 0.5), es una OR.
  // El triángulo tiene un ratio significativamente menor que una forma en D (rectángulo redondeado).
  const isTriangleShape = body.areaRatio < 0.6;

  const totalBounds = getStrokesBoundingBox(strokes)!;
  const gateId = generateId();

  return {
    elements: [
      {
        type: 'orgate',
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
    confidence: isOrText ? 0.95 : (isTriangleShape ? 0.85 : 0.4),
  };
}
