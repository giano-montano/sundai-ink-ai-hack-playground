import type { BoundingBox } from '../../types';
import type { RenderOptions } from '../registry/ElementPlugin';
import type { AndGateElement } from './types';

export function render(
  ctx: CanvasRenderingContext2D,
  element: AndGateElement,
  options?: RenderOptions
): void {
  const { left, top, right, bottom } = element.bounds;
  const totalWidth = right - left;
  const totalHeight = bottom - top;

  // Distribución de espacio: 20% pins izquierda, 60% cuerpo, 20% pin derecha
  const pinSpace = totalWidth * 0.2;
  const bodyWidth = totalWidth * 0.6;
  const bodyLeft = left + pinSpace;
  
  const arcRadius = totalHeight / 2;
  const bodyRectWidth = Math.max(0, bodyWidth - arcRadius);

  const isSelected = options?.strokeOptions?.isSelected;

  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = isSelected ? '#0078d4' : '#000000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Cuerpo (D)
  ctx.moveTo(bodyLeft, top);
  ctx.lineTo(bodyLeft + bodyRectWidth, top);
  ctx.arc(bodyLeft + bodyRectWidth, top + arcRadius, arcRadius, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(bodyLeft, bottom);
  ctx.lineTo(bodyLeft, top);
  
  // 2. Entradas (2 palitos)
  const inputY1 = top + totalHeight * 0.3;
  const inputY2 = top + totalHeight * 0.7;
  
  ctx.moveTo(left, inputY1);
  ctx.lineTo(bodyLeft, inputY1);
  
  ctx.moveTo(left, inputY2);
  ctx.lineTo(bodyLeft, inputY2);

  // 3. Salida (1 palito)
  const outputY = top + totalHeight * 0.5;
  const bodyRight = bodyLeft + bodyRectWidth + arcRadius;
  
  ctx.moveTo(bodyRight, outputY);
  ctx.lineTo(right, outputY);

  ctx.stroke();
  ctx.restore();
}

export function getBounds(element: AndGateElement): BoundingBox {
  return element.bounds;
}
