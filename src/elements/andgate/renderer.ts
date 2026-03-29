import type { BoundingBox } from '../../types';
import type { RenderOptions } from '../registry/ElementPlugin';
import type { AndGateElement } from './types';

export function render(
  ctx: CanvasRenderingContext2D,
  element: AndGateElement,
  options?: RenderOptions
): void {
  const { left, top, right, bottom } = element.bounds;
  const width = right - left;
  const height = bottom - top;

  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = options?.isSelected ? '#0078d4' : '#000000';
  ctx.lineWidth = 2;

  // Cuerpo de la compuerta AND (Forma de D)
  const arcRadius = height / 2;
  const rectWidth = width - arcRadius;

  ctx.moveTo(left, top);
  ctx.lineTo(left + rectWidth, top);
  ctx.arc(left + rectWidth, top + arcRadius, arcRadius, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(left, bottom);
  ctx.lineTo(left, top);
  
  // Entradas (izquierda)
  ctx.moveTo(left - 15, top + height * 0.3);
  ctx.lineTo(left, top + height * 0.3);
  ctx.moveTo(left - 15, top + height * 0.7);
  ctx.lineTo(left, top + height * 0.7);

  // Salida (derecha) - El arco termina en 'right'
  ctx.moveTo(right, top + height * 0.5);
  ctx.lineTo(right + 15, top + height * 0.5);

  ctx.stroke();
  ctx.restore();
}

export function getBounds(element: AndGateElement): BoundingBox {
  return element.bounds;
}
