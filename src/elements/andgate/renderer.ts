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

  const color1 = element.input1 === 1 ? '#e81123' : '#000000';
  const color2 = element.input2 === 1 ? '#e81123' : '#000000';
  const colorOut = element.output === 1 ? '#e81123' : '#000000';

  const pinSpace = totalWidth * 0.2;
  const bodyWidth = totalWidth * 0.6;
  const bodyLeft = left + pinSpace;
  const arcRadius = totalHeight / 2;
  const bodyRectWidth = Math.max(0, bodyWidth - arcRadius);

  const isSelected = options?.strokeOptions?.isSelected;

  ctx.save();
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Pines de Entrada
  const inputY1 = top + totalHeight * 0.3;
  const inputY2 = top + totalHeight * 0.7;
  
  ctx.beginPath();
  ctx.strokeStyle = color1;
  ctx.moveTo(left, inputY1);
  ctx.lineTo(bodyLeft, inputY1);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.strokeStyle = color2;
  ctx.moveTo(left, inputY2);
  ctx.lineTo(bodyLeft, inputY2);
  ctx.stroke();

  // 2. Cuerpo (D)
  ctx.beginPath();
  ctx.strokeStyle = isSelected ? '#0078d4' : '#000000';
  ctx.moveTo(bodyLeft, top);
  ctx.lineTo(bodyLeft + bodyRectWidth, top);
  ctx.arc(bodyLeft + bodyRectWidth, top + arcRadius, arcRadius, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(bodyLeft, bottom);
  ctx.lineTo(bodyLeft, top);
  ctx.stroke();

  // 3. Salida
  const outputY = top + totalHeight * 0.5;
  const bodyRight = bodyLeft + bodyRectWidth + arcRadius;
  
  ctx.beginPath();
  ctx.strokeStyle = colorOut;
  ctx.moveTo(bodyRight, outputY);
  ctx.lineTo(right, outputY);
  ctx.stroke();

  ctx.restore();
}

export function getBounds(element: AndGateElement): BoundingBox {
  return element.bounds;
}
