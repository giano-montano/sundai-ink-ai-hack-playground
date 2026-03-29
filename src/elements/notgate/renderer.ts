import type { BoundingBox } from '../../types';
import type { RenderOptions } from '../registry/ElementPlugin';
import type { NotGateElement } from './types';

export function render(
  ctx: CanvasRenderingContext2D,
  element: NotGateElement,
  options?: RenderOptions
): void {
  const { left, top, right, bottom } = element.bounds;
  const totalWidth = right - left;
  const totalHeight = bottom - top;

  const colorIn = element.input === 1 ? '#e81123' : '#000000';
  const colorOut = element.output === 1 ? '#e81123' : '#000000';

  const pinSpace = totalWidth * 0.2;
  const bodyWidth = totalWidth * 0.6;
  const bodyLeft = left + pinSpace;
  const bodyRight = bodyLeft + bodyWidth;
  const centerY = top + totalHeight / 2;
  
  const isSelected = options?.strokeOptions?.isSelected;

  ctx.save();
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Pin de Entrada
  ctx.beginPath();
  ctx.strokeStyle = colorIn;
  ctx.moveTo(left, centerY);
  ctx.lineTo(bodyLeft, centerY);
  ctx.stroke();

  // 2. Cuerpo (Triángulo)
  ctx.beginPath();
  ctx.strokeStyle = isSelected ? '#0078d4' : '#000000';
  ctx.moveTo(bodyLeft, top);
  ctx.lineTo(bodyLeft, bottom);
  ctx.lineTo(bodyRight - 10, centerY); // Un poco antes de la burbuja
  ctx.closePath();
  ctx.stroke();

  // 3. Burbuja NOT
  const bubbleRadius = 4;
  ctx.beginPath();
  ctx.arc(bodyRight - bubbleRadius, centerY, bubbleRadius, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Salida
  ctx.beginPath();
  ctx.strokeStyle = colorOut;
  ctx.moveTo(bodyRight, centerY);
  ctx.lineTo(right, centerY);
  ctx.stroke();

  ctx.restore();
}

export function getBounds(element: NotGateElement): BoundingBox {
  return element.bounds;
}
