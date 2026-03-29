import type { BoundingBox, Offset, Stroke } from '../../types';
import { boundingBoxHeight, boundingBoxWidth } from '../../types/primitives';
import { getStrokesBoundingBox } from '../registry/ElementRegistry';
import { splitGateSketchStrokes } from '../logicgate/sketch';

const MIN_SIZE = 36;
const LEFT_PROFILE_LIMIT_X = 0.45;

export interface OrGateDetectionResult {
  bounds: BoundingBox;
  concavity: number;
  symmetry: number;
  tipCentered: number;
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

function averageX(points: Offset[]): number | null {
  if (points.length === 0) return null;
  return points.reduce((sum, point) => sum + point.x, 0) / points.length;
}

function averageY(points: Offset[]): number | null {
  if (points.length === 0) return null;
  return points.reduce((sum, point) => sum + point.y, 0) / points.length;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizePoints(points: Offset[], bounds: BoundingBox): Offset[] {
  const width = Math.max(1, boundingBoxWidth(bounds));
  const height = Math.max(1, boundingBoxHeight(bounds));

  return points.map((point) => ({
    x: (point.x - bounds.left) / width,
    y: (point.y - bounds.top) / height,
  }));
}

export function analyzeOrGateBody(strokes: Stroke[]): OrGateDetectionResult | null {
  const sketch = splitGateSketchStrokes(strokes);
  const bounds = sketch.bodyBounds ?? getStrokesBoundingBox(strokes);
  if (!bounds) return null;

  const width = boundingBoxWidth(bounds);
  const height = boundingBoxHeight(bounds);
  if (width < MIN_SIZE || height < MIN_SIZE) return null;

  const aspect = width / height;
  if (aspect < 0.7 || aspect > 1.9) return null;

  const points = normalizePoints(
    getStrokePoints(sketch.bodyStrokes.length > 0 ? sketch.bodyStrokes : strokes),
    bounds,
  );
  if (points.length < 12) return null;

  const topCurve = points.filter((point) => point.y <= 0.26 && point.x >= 0.12 && point.x <= 0.84);
  const bottomCurve = points.filter((point) => point.y >= 0.74 && point.x >= 0.12 && point.x <= 0.84);
  const tipPoints = points.filter((point) => point.x >= 0.82 && point.y >= 0.32 && point.y <= 0.68);
  const leftProfile = points.filter((point) => point.x <= LEFT_PROFILE_LIMIT_X);
  const profileTop = leftProfile.filter((point) => point.y >= 0.08 && point.y <= 0.3);
  const profileMiddle = leftProfile.filter((point) => point.y >= 0.38 && point.y <= 0.62);
  const profileBottom = leftProfile.filter((point) => point.y >= 0.7 && point.y <= 0.92);

  const hasTop = coverage(topCurve, 'x', 4) >= 0.5;
  const hasBottom = coverage(bottomCurve, 'x', 4) >= 0.5;
  const hasTip = tipPoints.length >= 2;
  const hasRearTop = profileTop.length > 0;
  const hasRearBottom = profileBottom.length > 0;
  const hasRearMiddle = profileMiddle.length > 0;
  const rearTopAverageX = averageX(profileTop);
  const rearMiddleAverageX = averageX(profileMiddle);
  const rearBottomAverageX = averageX(profileBottom);
  if (
    !hasTop ||
    !hasBottom ||
    !hasTip ||
    !hasRearTop ||
    !hasRearBottom ||
    !hasRearMiddle ||
    rearTopAverageX === null ||
    rearMiddleAverageX === null ||
    rearBottomAverageX === null
  ) {
    return null;
  }

  const rearEndsAverageX = (rearTopAverageX + rearBottomAverageX) / 2;
  const rearConcavity = clamp01((rearMiddleAverageX - rearEndsAverageX) / 0.1);
  const topAverageY = averageY(profileTop);
  const bottomAverageY = averageY(profileBottom);
  const tipAverageY = averageY(tipPoints);
  const rearSymmetry =
    topAverageY === null || bottomAverageY === null
      ? 0
      : clamp01(1 - Math.abs(topAverageY - (1 - bottomAverageY)) / 0.24);
  const tipCentered =
    tipAverageY === null ? 0 : clamp01(1 - Math.abs(tipAverageY - 0.5) / 0.2);

  if (rearConcavity < 0.32) return null;

  return {
    bounds,
    concavity: rearConcavity,
    symmetry: rearSymmetry,
    tipCentered,
    leftWireCount: sketch.leftWireCount,
    rightWireCount: sketch.rightWireCount,
  };
}

export function detectOrGateBodyBounds(strokes: Stroke[]): BoundingBox | null {
  return analyzeOrGateBody(strokes)?.bounds ?? null;
}
