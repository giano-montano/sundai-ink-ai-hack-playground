import type { BoundingBox, Stroke } from '../../types';
import { boundingBoxHeight, boundingBoxWidth } from '../../types/primitives';
import { getStrokesBoundingBox } from '../registry/ElementRegistry';

interface StrokeMetric {
  stroke: Stroke;
  bounds: BoundingBox;
  width: number;
  height: number;
  centerX: number;
  startY: number;
  endY: number;
}

export interface GateSketchParts {
  overallBounds: BoundingBox | null;
  bodyBounds: BoundingBox | null;
  bodyStrokes: Stroke[];
  leftWireCount: number;
  rightWireCount: number;
}

function getStrokeMetric(stroke: Stroke): StrokeMetric | null {
  const bounds = getStrokesBoundingBox([stroke]);
  if (!bounds) return null;

  const inputs = stroke.inputs.inputs;
  const first = inputs[0];
  const last = inputs[inputs.length - 1];

  return {
    stroke,
    bounds,
    width: boundingBoxWidth(bounds),
    height: boundingBoxHeight(bounds),
    centerX: (bounds.left + bounds.right) / 2,
    startY: first?.y ?? bounds.top,
    endY: last?.y ?? bounds.bottom,
  };
}

function isHorizontalWire(
  metric: StrokeMetric,
  overallBounds: BoundingBox,
): boolean {
  const overallWidth = boundingBoxWidth(overallBounds);
  const overallHeight = boundingBoxHeight(overallBounds);
  const maxHeight = Math.max(12, overallHeight * 0.18);
  const minWidth = Math.max(18, overallWidth * 0.14);
  const endDeltaY = Math.abs(metric.startY - metric.endY);

  return (
    metric.width >= minWidth &&
    metric.height <= maxHeight &&
    endDeltaY <= maxHeight
  );
}

function isSmallMark(
  metric: StrokeMetric,
  overallBounds: BoundingBox,
): boolean {
  const overallWidth = boundingBoxWidth(overallBounds);
  const overallHeight = boundingBoxHeight(overallBounds);
  const maxWidth = Math.max(14, overallWidth * 0.14);
  const maxHeight = Math.max(18, overallHeight * 0.34);

  return (
    metric.width <= maxWidth &&
    metric.height <= maxHeight &&
    metric.centerX <= overallBounds.left + overallWidth * 0.42
  );
}

export function splitGateSketchStrokes(strokes: Stroke[]): GateSketchParts {
  const overallBounds = getStrokesBoundingBox(strokes);
  if (!overallBounds) {
    return {
      overallBounds: null,
      bodyBounds: null,
      bodyStrokes: [],
      leftWireCount: 0,
      rightWireCount: 0,
    };
  }

  const overallWidth = boundingBoxWidth(overallBounds);
  const metrics = strokes
    .map(getStrokeMetric)
    .filter((metric): metric is StrokeMetric => metric !== null);
  const leftWireLimit = overallBounds.left + overallWidth * 0.46;
  const rightWireLimit = overallBounds.left + overallWidth * 0.54;

  const leftWires = metrics.filter(
    (metric) =>
      isHorizontalWire(metric, overallBounds) &&
      metric.bounds.right <= leftWireLimit,
  );
  const rightWires = metrics.filter(
    (metric) =>
      isHorizontalWire(metric, overallBounds) &&
      metric.bounds.left >= rightWireLimit,
  );
  const ignoredMarks = metrics.filter(
    (metric) =>
      !leftWires.includes(metric) &&
      !rightWires.includes(metric) &&
      isSmallMark(metric, overallBounds),
  );

  let bodyMetrics = metrics.filter(
    (metric) =>
      !leftWires.includes(metric) &&
      !rightWires.includes(metric) &&
      !ignoredMarks.includes(metric),
  );

  if (bodyMetrics.length < 2) {
    bodyMetrics = metrics.filter(
      (metric) =>
        !leftWires.includes(metric) &&
        !rightWires.includes(metric),
    );
  }

  const bodyStrokes = bodyMetrics.map((metric) => metric.stroke);
  const bodyBounds = getStrokesBoundingBox(bodyStrokes);

  return {
    overallBounds,
    bodyBounds,
    bodyStrokes,
    leftWireCount: leftWires.length,
    rightWireCount: rightWires.length,
  };
}
