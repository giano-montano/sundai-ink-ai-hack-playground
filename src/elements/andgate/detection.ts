import type { BoundingBox, Offset, Stroke } from '../../types';
import { boundingBoxHeight, boundingBoxWidth } from '../../types/primitives';
import { getStrokesBoundingBox } from '../registry/ElementRegistry';

const MIN_SIZE = 36;

function getStrokePoints(strokes: Stroke[]): Offset[] {
  return strokes.flatMap((stroke) =>
    stroke.inputs.inputs.map((input) => ({ x: input.x, y: input.y })),
  );
}

function coverage(points: Offset[], axis: 'x' | 'y', bucketCount: number): number {
  if (points.length === 0) return 0;

  const buckets = new Set<number>();
  for (const point of points) {
    const value = axis === 'x' ? point.x : point.y;
    const index = Math.max(0, Math.min(bucketCount - 1, Math.floor(value * bucketCount)));
    buckets.add(index);
  }

  return buckets.size / bucketCount;
}

function normalizePoints(points: Offset[], bounds: BoundingBox): Offset[] {
  const width = Math.max(1, boundingBoxWidth(bounds));
  const height = Math.max(1, boundingBoxHeight(bounds));

  return points.map((point) => ({
    x: (point.x - bounds.left) / width,
    y: (point.y - bounds.top) / height,
  }));
}

export function detectAndGateBodyBounds(strokes: Stroke[]): BoundingBox | null {
  const bounds = getStrokesBoundingBox(strokes);
  if (!bounds) return null;

  const width = boundingBoxWidth(bounds);
  const height = boundingBoxHeight(bounds);
  if (width < MIN_SIZE || height < MIN_SIZE) return null;

  const aspect = width / height;
  if (aspect < 0.6 || aspect > 1.8) return null;

  const points = normalizePoints(getStrokePoints(strokes), bounds);
  if (points.length < 12) return null;

  const leftSide = points.filter((point) => point.x <= 0.22);
  const topSide = points.filter((point) => point.y <= 0.2 && point.x <= 0.65);
  const bottomSide = points.filter((point) => point.y >= 0.8 && point.x <= 0.65);
  const arcSide = points.filter((point) => {
    const dx = point.x - 0.55;
    const dy = point.y - 0.5;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return point.x >= 0.42 && Math.abs(distance - 0.35) <= 0.2;
  });

  const hasLeft = coverage(leftSide, 'y', 4) >= 0.75;
  const hasTop = coverage(topSide, 'x', 3) >= 0.66;
  const hasBottom = coverage(bottomSide, 'x', 3) >= 0.66;
  const hasArc = coverage(arcSide, 'y', 4) >= 0.75;

  return hasLeft && hasTop && hasBottom && hasArc ? bounds : null;
}
