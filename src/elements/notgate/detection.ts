import type { BoundingBox, Offset, Stroke } from '../../types';
import { mergeBoundingBoxes } from '../../types/primitives';
import { getStrokesBoundingBox } from '../registry/ElementRegistry';

function distance(a: Offset, b: Offset): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function hasPointNear(points: Offset[], target: Offset, threshold: number): boolean {
  return points.some((point) => distance(point, target) <= threshold);
}

export function detectNotGateBodyBounds(strokes: Stroke[]): BoundingBox | null {
  if (strokes.length < 2) return null;

  const strokeBounds = strokes.map((stroke) => getStrokesBoundingBox([stroke]));
  const validBounds = strokeBounds.filter((bounds): bounds is BoundingBox => bounds !== null);
  const overallBounds = mergeBoundingBoxes(validBounds);
  if (!overallBounds) return null;

  const bubbleIndex = validBounds.findIndex((bounds) => {
    const width = bounds.right - bounds.left;
    const height = bounds.bottom - bounds.top;
    const centerX = (bounds.left + bounds.right) / 2;
    return (
      width > 6 &&
      height > 6 &&
      width <= (overallBounds.right - overallBounds.left) * 0.32 &&
      height <= (overallBounds.bottom - overallBounds.top) * 0.4 &&
      width / height >= 0.6 &&
      width / height <= 1.4 &&
      centerX >= overallBounds.left + (overallBounds.right - overallBounds.left) * 0.7
    );
  });

  if (bubbleIndex < 0) return null;

  const bodyBoxes = validBounds.filter((_, index) => index !== bubbleIndex);
  const bodyBounds = mergeBoundingBoxes(bodyBoxes);
  if (!bodyBounds) return null;

  const width = bodyBounds.right - bodyBounds.left;
  const height = bodyBounds.bottom - bodyBounds.top;
  if (width < 30 || height < 30) return null;

  const bodyPoints = strokes
    .filter((_, index) => index !== bubbleIndex)
    .flatMap((stroke) => stroke.inputs.inputs.map((input) => ({ x: input.x, y: input.y })));
  if (bodyPoints.length < 6) return null;

  const threshold = Math.max(10, Math.max(width, height) * 0.18);
  const hasTopLeft = hasPointNear(bodyPoints, { x: bodyBounds.left, y: bodyBounds.top }, threshold);
  const hasBottomLeft = hasPointNear(bodyPoints, { x: bodyBounds.left, y: bodyBounds.bottom }, threshold);
  const hasTip = hasPointNear(bodyPoints, { x: bodyBounds.right, y: (bodyBounds.top + bodyBounds.bottom) / 2 }, threshold);

  return hasTopLeft && hasBottomLeft && hasTip ? bodyBounds : null;
}
