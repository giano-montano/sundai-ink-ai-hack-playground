import type { BoundingBox } from '../../types';
import type { RenderOptions } from '../registry/ElementPlugin';
import {
  getLogicGateRenderBounds,
  renderLogicGateWiresAndValues,
} from '../logicgate/shared';
import type { OrGateElement } from './types';

export function render(
  ctx: CanvasRenderingContext2D,
  element: OrGateElement,
  options?: RenderOptions,
): void {
  const body = element.bodyBounds;
  const width = body.right - body.left;
  const height = body.bottom - body.top;
  const centerY = body.top + height / 2;
  const rearTop = {
    x: body.left + width * 0.08,
    y: body.top + height * 0.08,
  };
  const rearBottom = {
    x: body.left + width * 0.08,
    y: body.bottom - height * 0.08,
  };
  const shellTop = {
    x: body.left + width * 0.18,
    y: body.top + height * 0.02,
  };
  const shellBottom = {
    x: body.left + width * 0.18,
    y: body.bottom - height * 0.02,
  };

  renderLogicGateWiresAndValues(ctx, element, options);
  ctx.save();
  ctx.translate(element.transform.values[6], element.transform.values[7]);
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(shellTop.x, shellTop.y);
  ctx.bezierCurveTo(
    body.left + width * 0.48,
    body.top,
    body.right - width * 0.16,
    centerY - height * 0.2,
    body.right,
    centerY,
  );
  ctx.bezierCurveTo(
    body.right - width * 0.16,
    centerY + height * 0.2,
    body.left + width * 0.48,
    body.bottom,
    shellBottom.x,
    shellBottom.y,
  );
  ctx.quadraticCurveTo(body.left + width * 0.34, centerY, rearTop.x, rearTop.y);
  ctx.moveTo(rearTop.x, rearTop.y);
  ctx.quadraticCurveTo(body.left + width * 0.34, centerY, rearBottom.x, rearBottom.y);
  ctx.stroke();

  ctx.restore();
}

export function getBounds(element: OrGateElement): BoundingBox | null {
  return getLogicGateRenderBounds(element);
}
