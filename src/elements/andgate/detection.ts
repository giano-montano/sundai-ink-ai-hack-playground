import type { BoundingBox, Offset, Stroke } from '../../types';
import { boundingBoxHeight, boundingBoxWidth } from '../../types/primitives';
import { getStrokesBoundingBox } from '../registry/ElementRegistry';
import { splitGateSketchStrokes } from '../logicgate/sketch';

const MIN_SIZE = 36;
const LEFT_PROFILE_LIMIT_X = 0.3;

export interface AndGateDetectionResult {
  bounds: BoundingBox;
  straightness: number;
  concavity: number;
  leftWireCount: number;
  rightWireCount: number;
}

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

function averageX(points: Offset[]): number | null {
  if (points.length === 0) return null;
  return points.reduce((sum, point) => sum + point.x, 0) / points.length;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function analyzeLeftProfile(points: Offset[]): { straightness: number; concavity: number } {
  const leftPoints = points.filter((point) => point.x <= LEFT_PROFILE_LIMIT_X);
  const top = averageX(leftPoints.filter((point) => point.y >= 0.12 && point.y <= 0.35));
  const middle = averageX(leftPoints.filter((point) => point.y >= 0.4 && point.y <= 0.6));
  const bottom = averageX(leftPoints.filter((point) => point.y >= 0.65 && point.y <= 0.88));

  if (top === null || middle === null || bottom === null) {
    return { straightness: 0, concavity: 0 };
  }

  const spread = Math.max(
    Math.abs(top - middle),
    Math.abs(middle - bottom),
    Math.abs(top - bottom),
  );
  const concavityDepth = middle - (top + bottom) / 2;

  return {
    straightness: clamp01(1 - spread / 0.12),
    concavity: clamp01(concavityDepth / 0.12),
  };
}

export function analyzeAndGateBody(strokes: Stroke[]): AndGateDetectionResult | null {
  const sketch = splitGateSketchStrokes(strokes);
  const bounds = sketch.bodyBounds ?? getStrokesBoundingBox(strokes);
  if (!bounds) return null;

  const width = boundingBoxWidth(bounds);
  const height = boundingBoxHeight(bounds);
  if (width < MIN_SIZE || height < MIN_SIZE) return null;

  const aspect = width / height;
  if (aspect < 0.6 || aspect > 1.8) return null;

  const points = normalizePoints(getStrokePoints(sketch.bodyStrokes.length > 0 ? sketch.bodyStrokes : strokes), bounds);
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
  const leftProfile = analyzeLeftProfile(points);

  if (!hasLeft || !hasTop || !hasBottom || !hasArc) return null;
  if (leftProfile.straightness < 0.55) return null;
  if (leftProfile.concavity > 0.35) return null;

  return {
    bounds,
    straightness: leftProfile.straightness,
    concavity: leftProfile.concavity,
    leftWireCount: sketch.leftWireCount,
    rightWireCount: sketch.rightWireCount,
  };
}

export function detectAndGateBodyBounds(strokes: Stroke[]): BoundingBox | null {
  return analyzeAndGateBody(strokes)?.bounds ?? null;
}
