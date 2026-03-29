import type { Stroke } from '../../types';
import type { AndGateElement } from './types';
import { generateId, IDENTITY_MATRIX } from '../../types/primitives';
import { getStrokesBoundingBox } from '../registry';
import type { CreationContext, CreationResult } from '../registry/ElementPlugin';

export function canCreate(strokes: Stroke[]): boolean {
  // Aceptamos entre 3 y 5 trazos (D + 2 entradas + 1 salida = 4 idealmente)
  return strokes.length >= 3 && strokes.length <= 5;
}

export async function createFromInk(
  strokes: Stroke[],
  _context: CreationContext
): Promise<CreationResult | null> {
  const strokeData = strokes.map(s => {
    const b = getStrokesBoundingBox([s])!;
    return {
      stroke: s,
      bounds: b,
      area: (b.right - b.left) * (b.bottom - b.top),
      width: b.right - b.left,
      height: b.bottom - b.top,
      centerX: (b.left + b.right) / 2,
      centerY: (b.top + b.bottom) / 2,
      isHorizontal: (b.right - b.left) > (b.bottom - b.top) * 1.5
    };
  });

  // 1. Identificar el cuerpo (el trazo con más área que no sea extremadamente horizontal)
  const bodyCandidates = strokeData
    .filter(s => s.width / s.height < 3.0) // No puede ser una línea muy larga
    .sort((a, b) => b.area - a.area);

  if (bodyCandidates.length === 0) return null;
  const body = bodyCandidates[0];
  const others = strokeData.filter(s => s !== body);

  // 2. Clasificar pines (deben ser mayormente horizontales)
  const bodyCenterX = body.centerX;
  const bodyWidth = body.width;

  // Entradas: a la izquierda del centro del cuerpo, terminando cerca o dentro del borde izquierdo
  const inputs = others.filter(o => 
    o.centerX < bodyCenterX && 
    o.bounds.right < bodyCenterX &&
    o.isHorizontal
  );

  // Salidas: a la derecha del centro del cuerpo, empezando cerca o dentro del borde derecho
  const outputs = others.filter(o => 
    o.centerX > bodyCenterX && 
    o.bounds.left > bodyCenterX - bodyWidth * 0.2 &&
    o.isHorizontal
  );

  // 3. Validación estricta: 2 entradas y 1 salida
  // Si hay 4 trazos totales, esperamos 1 cuerpo, 2 entradas, 1 salida.
  const hasTwoInputs = inputs.length === 2;
  const hasOneOutput = outputs.length === 1;

  if (!hasTwoInputs || !hasOneOutput) return null;

  // 4. Verificación de coherencia espacial
  const totalBounds = getStrokesBoundingBox(strokes)!;
  const totalWidth = totalBounds.right - totalBounds.left;
  
  // Si el conjunto es demasiado disperso, no es una compuerta
  if (totalWidth > bodyWidth * 5) return null;

  const element: AndGateElement = {
    type: 'andgate',
    id: generateId(),
    transform: IDENTITY_MATRIX,
    bounds: totalBounds,
    sourceStrokes: strokes,
  };

  return {
    elements: [element],
    consumedStrokes: strokes,
    confidence: 0.9,
  };
}
