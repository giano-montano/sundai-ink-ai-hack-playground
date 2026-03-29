import type { BoundingBox } from '../../types';
import type { RenderOptions } from '../registry/ElementPlugin';
import type { LogicInputElement } from './types';

export function render(
  ctx: CanvasRenderingContext2D,
  element: LogicInputElement,
  options?: RenderOptions
): void {
  const { left, top, right, bottom } = element.bounds;
  const width = right - left;
  const height = bottom - top;
  const isSelected = options?.strokeOptions?.isSelected;

  ctx.save();
  
  // 1. Dibujar Caja
  ctx.beginPath();
  ctx.strokeStyle = isSelected ? '#0078d4' : '#000000';
  ctx.lineWidth = 2;
  ctx.strokeRect(left, top, width, height);

  // Fondo blanco (para tapar lo que haya debajo)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(left + 1, top + 1, width - 2, height - 2);

  // 2. Dibujar Valor (0 o 1)
  ctx.fillStyle = element.value === 1 ? '#e81123' : '#000000';
  ctx.font = `bold ${Math.min(width, height) * 0.8}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    element.value.toString(),
    left + width / 2,
    top + height / 2
  );

  ctx.restore();
}

export function getBounds(element: LogicInputElement): BoundingBox {
  return element.bounds;
}
