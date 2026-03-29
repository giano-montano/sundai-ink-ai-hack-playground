import type { BoundingBox } from '../../types';
import type { AndGateElement } from './types';
import type { RenderOptions } from '../registry/ElementPlugin';

export function render(
  ctx: CanvasRenderingContext2D,
  element: AndGateElement,
  options?: RenderOptions
): void {
    return;
}

export function getBounds(element: AndGateElement): BoundingBox | null {
  return {
    left: 0,
    top: 0,
    right: 20,
    bottom: 20,
  };
}
