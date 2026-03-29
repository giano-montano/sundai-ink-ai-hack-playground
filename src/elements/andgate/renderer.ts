import type { BoundingBox } from '../../types';
import { boundingBoxFromOffsets } from '../../types/primitives';
import type { RenderOptions } from '../registry/ElementPlugin';
import type { AndGateElement } from './types';
import {
  getOutputCanvasOuterPoint,
  getAndGateCanvasBounds,
  toCanvasPoint,
} from './types';

function renderValue(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  value: 0 | 1 | null,
): void {
  if (value === null) return;

  ctx.save();
  ctx.fillStyle = '#111111';
  ctx.font = '600 18px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(String(value), x, y);
  ctx.restore();
}

export function render(
  ctx: CanvasRenderingContext2D,
  element: AndGateElement,
  _options?: RenderOptions,
): void {
  const body = element.bodyBounds;
  const bodyHeight = body.bottom - body.top;
  const radius = bodyHeight / 2;
  const centerY = body.top + radius;
  const arcCenterX = body.right - radius;

  ctx.save();
  ctx.translate(element.transform.values[6], element.transform.values[7]);
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 0; i < element.inputs.length; i++) {
    const input = element.inputs[i];
    ctx.beginPath();
    ctx.moveTo(input.outerPoint.x, input.outerPoint.y);
    ctx.lineTo(input.attachPoint.x, input.attachPoint.y);
    ctx.stroke();

    renderValue(
      ctx,
      (input.outerPoint.x + input.attachPoint.x) / 2,
      input.attachPoint.y - 8,
      element.resolvedInputs[i] ?? null,
    );
  }

  ctx.beginPath();
  ctx.moveTo(body.left, body.top);
  ctx.lineTo(arcCenterX, body.top);
  ctx.arc(arcCenterX, centerY, radius, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(body.left, body.bottom);
  ctx.lineTo(body.left, body.top);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(element.outputAttachPoint.x, element.outputAttachPoint.y);
  ctx.lineTo(element.outputOuterPoint.x, element.outputOuterPoint.y);
  ctx.stroke();

  renderValue(
    ctx,
    element.outputOuterPoint.x + 18,
    element.outputOuterPoint.y - 8,
    element.outputValue,
  );

  ctx.restore();
}

export function getBounds(element: AndGateElement): BoundingBox | null {
  const outputPoint = getOutputCanvasOuterPoint(element);
  const valuePoints = [
    ...element.inputs.map((input) =>
      toCanvasPoint(element, {
        x: (input.outerPoint.x + input.attachPoint.x) / 2,
        y: input.attachPoint.y - 18,
      }),
    ),
    { x: outputPoint.x + 26, y: outputPoint.y - 18 },
  ];

  const baseBounds = getAndGateCanvasBounds(element);
  const allPoints = [
    { x: baseBounds.left, y: baseBounds.top },
    { x: baseBounds.right, y: baseBounds.bottom },
    ...valuePoints,
  ];

  return boundingBoxFromOffsets(allPoints);
}
