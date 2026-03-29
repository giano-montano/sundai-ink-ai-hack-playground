import type { BoundingBox } from '../../types';
import type { RenderOptions } from '../registry/ElementPlugin';
import type { OrGateElement } from './types';

export function render(
  ctx: CanvasRenderingContext2D,
  element: OrGateElement,
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
  const bodyRight = bodyLeft + bodyWidth;
  
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
  ctx.lineTo(bodyLeft + 5, inputY1); // Entra un poco en la curva
  ctx.stroke();
  
  ctx.beginPath();
  ctx.strokeStyle = color2;
  ctx.moveTo(left, inputY2);
  ctx.lineTo(bodyLeft + 5, inputY2);
  ctx.stroke();

  // 2. Cuerpo (OR gate shape: curved back, curved front pointed)
  ctx.beginPath();
  ctx.strokeStyle = isSelected ? '#0078d4' : '#000000';
  
  // Back curve (entrada)
  ctx.moveTo(bodyLeft, top);
  ctx.quadraticCurveTo(bodyLeft + totalWidth * 0.15, top + totalHeight / 2, bodyLeft, bottom);
  
  // Bottom curve (hacia el frente)
  ctx.quadraticCurveTo(bodyLeft + bodyWidth * 0.5, bottom, bodyRight, top + totalHeight / 2);
  
  // Top curve (hacia el frente)
  ctx.moveTo(bodyLeft, top);
  ctx.quadraticCurveTo(bodyLeft + bodyWidth * 0.5, top, bodyRight, top + totalHeight / 2);
  ctx.stroke();

  // 3. Salida
  const outputY = top + totalHeight / 2;
  ctx.beginPath();
  ctx.strokeStyle = colorOut;
  ctx.moveTo(bodyRight, outputY);
  ctx.lineTo(right, outputY);
  ctx.stroke();

  ctx.restore();
}

export function getBounds(element: OrGateElement): BoundingBox {
  return element.bounds;
}
