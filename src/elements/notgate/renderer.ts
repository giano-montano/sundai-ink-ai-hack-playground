import type { BoundingBox } from '../../types';
import type { RenderOptions } from '../registry/ElementPlugin';
import {
  getLogicGateRenderBounds,
  renderLogicGateWiresAndValues,
} from '../logicgate/shared';
import type { NotGateElement } from './types';

export function render(
  ctx: CanvasRenderingContext2D,
  element: NotGateElement,
  options?: RenderOptions,
): void {
  const body = element.bodyBounds;
  const bubbleRadius = element.bubbleRadius ?? Math.max(6, (body.bottom - body.top) * 0.1);
  const bubbleCenter = element.bubbleCenter ?? {
    x: body.right + bubbleRadius + 6,
    y: (body.top + body.bottom) / 2,
  };

  renderLogicGateWiresAndValues(ctx, element, options);
  ctx.save();
  ctx.translate(element.transform.values[6], element.transform.values[7]);
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(body.left, body.top);
  ctx.lineTo(body.right, (body.top + body.bottom) / 2);
  ctx.lineTo(body.left, body.bottom);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(bubbleCenter.x, bubbleCenter.y, bubbleRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

export function getBounds(element: NotGateElement): BoundingBox | null {
  return getLogicGateRenderBounds(element);
}
