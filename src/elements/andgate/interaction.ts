import type { BoundingBox, Element, Offset, Stroke } from '../../types';
import type { HandwritingRecognitionResult } from '../../recognition/RecognitionService';
import { getRecognitionService } from '../../recognition/RecognitionService';
import type {
  InteractionContext,
  InteractionResult,
} from '../registry/ElementPlugin';
import { getStrokesBoundingBox } from '../registry/ElementRegistry';
import { parseLogicBit, resolveAndGateElements } from './logic';
import type { AndGateElement, LogicBit } from './types';
import {
  getAndGateCanvasBounds,
  getInputCanvasAttachPoint,
  getInputCanvasOuterPoint,
  getOutputCanvasAttachPoint,
  getOutputCanvasOuterPoint,
  isAndGateElement,
} from './types';

const INTEREST_MARGIN = 70;
const HIT_DISTANCE = 28;
const STRAIGHTNESS_THRESHOLD = 0.9;
const INPUT_VALUE_MARGIN_X = 18;
const INPUT_VALUE_MARGIN_TOP = 46;
const INPUT_VALUE_MARGIN_BOTTOM = 20;

function overlaps(a: BoundingBox, b: BoundingBox): boolean {
  return !(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top);
}

function expand(box: BoundingBox, amount: number): BoundingBox {
  return {
    left: box.left - amount,
    top: box.top - amount,
    right: box.right + amount,
    bottom: box.bottom + amount,
  };
}

function distance(a: Offset, b: Offset): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function pointToSegmentDistance(point: Offset, start: Offset, end: Offset): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) return distance(point, start);

  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared),
  );

  return distance(point, {
    x: start.x + dx * t,
    y: start.y + dy * t,
  });
}

function getStrokeCenter(strokes: Stroke[]): Offset | null {
  const bounds = getStrokesBoundingBox(strokes);
  if (!bounds) return null;
  return {
    x: (bounds.left + bounds.right) / 2,
    y: (bounds.top + bounds.bottom) / 2,
  };
}

function getStrokeEndpoints(strokes: Stroke[]): { start: Offset; end: Offset } | null {
  if (strokes.length !== 1) return null;
  const inputs = strokes[0].inputs.inputs;
  if (inputs.length < 2) return null;

  return {
    start: { x: inputs[0].x, y: inputs[0].y },
    end: { x: inputs[inputs.length - 1].x, y: inputs[inputs.length - 1].y },
  };
}

function computeStraightness(stroke: Stroke): number {
  const inputs = stroke.inputs.inputs;
  if (inputs.length < 2) return 0;

  const start = inputs[0];
  const end = inputs[inputs.length - 1];
  const direct = Math.hypot(end.x - start.x, end.y - start.y);

  let path = 0;
  for (let i = 1; i < inputs.length; i++) {
    path += Math.hypot(
      inputs[i].x - inputs[i - 1].x,
      inputs[i].y - inputs[i - 1].y,
    );
  }

  return path === 0 ? 0 : direct / path;
}

function getMajorSegments(stroke: Stroke): Array<{ start: Offset; end: Offset; length: number }> {
  const points = stroke.inputs.inputs;
  if (points.length < 2) return [];

  const bounds = getStrokesBoundingBox([stroke]);
  const minLength = bounds
    ? Math.max(8, Math.max(bounds.right - bounds.left, bounds.bottom - bounds.top) * 0.12)
    : 8;

  const segments: Array<{ start: Offset; end: Offset; length: number }> = [];
  let segmentStart = 0;
  let lastAngle: number | null = null;

  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const stepLength = Math.hypot(dx, dy);
    if (stepLength < 1.5) continue;

    const angle = Math.atan2(dy, dx);
    if (lastAngle === null) {
      lastAngle = angle;
      continue;
    }

    const angleDelta = Math.abs(Math.atan2(Math.sin(angle - lastAngle), Math.cos(angle - lastAngle)));
    const segmentLength = Math.hypot(
      points[i - 1].x - points[segmentStart].x,
      points[i - 1].y - points[segmentStart].y,
    );

    if (angleDelta > Math.PI / 5 && segmentLength >= minLength) {
      segments.push({
        start: { x: points[segmentStart].x, y: points[segmentStart].y },
        end: { x: points[i - 1].x, y: points[i - 1].y },
        length: segmentLength,
      });
      segmentStart = i - 1;
    }

    lastAngle = angle;
  }

  const endLength = Math.hypot(
    points[points.length - 1].x - points[segmentStart].x,
    points[points.length - 1].y - points[segmentStart].y,
  );
  if (endLength >= minLength) {
    segments.push({
      start: { x: points[segmentStart].x, y: points[segmentStart].y },
      end: { x: points[points.length - 1].x, y: points[points.length - 1].y },
      length: endLength,
    });
  }

  return segments;
}

function isVerticalSegment(start: Offset, end: Offset): boolean {
  return Math.abs(end.y - start.y) >= Math.abs(end.x - start.x) * 1.8;
}

function isHorizontalSegment(start: Offset, end: Offset): boolean {
  return Math.abs(end.x - start.x) >= Math.abs(end.y - start.y) * 1.8;
}

function isDiagonalSegment(start: Offset, end: Offset): boolean {
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  return dx > 4 && dy > 4 && dx <= dy * 1.4 && dy <= dx * 1.8;
}

function closestEndpointDistance(segment: { start: Offset; end: Offset }, point: Offset): number {
  return Math.min(distance(segment.start, point), distance(segment.end, point));
}

function isZeroShape(strokes: Stroke[], bounds: BoundingBox): boolean {
  const endpoints = getStrokeEndpoints(strokes);
  if (!endpoints) return false;

  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const pathClosed = distance(endpoints.start, endpoints.end) <= Math.max(width, height) * 0.35;
  return pathClosed && width > 8 && height > 8 && width / height >= 0.55 && width / height <= 1.45;
}

function isOneShape(strokes: Stroke[], bounds: BoundingBox): boolean {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  if (height < width * 1.1) return false;

  const segments = strokes.flatMap(getMajorSegments).filter((segment) => segment.length >= 8);
  const verticalSegments = segments.filter((segment) => isVerticalSegment(segment.start, segment.end));
  if (verticalSegments.length === 0) return false;

  const mainVertical = verticalSegments.reduce((best, current) =>
    Math.abs(current.end.y - current.start.y) > Math.abs(best.end.y - best.start.y) ? current : best,
  );
  const verticalTop = mainVertical.start.y < mainVertical.end.y ? mainVertical.start : mainVertical.end;
  const verticalBottom = mainVertical.start.y > mainVertical.end.y ? mainVertical.start : mainVertical.end;
  const verticalSpan = Math.abs(verticalBottom.y - verticalTop.y);
  if (verticalSpan < height * 0.55) return false;

  if (segments.length === 1 && computeStraightness(strokes[0]) >= 0.92 && height > width * 1.4) {
    return true;
  }

  const diagonalSegments = segments.filter((segment) =>
    isDiagonalSegment(segment.start, segment.end) &&
    Math.min(segment.start.y, segment.end.y) <= bounds.top + height * 0.45,
  );
  const baseSegments = segments.filter((segment) =>
    isHorizontalSegment(segment.start, segment.end) &&
    Math.max(segment.start.y, segment.end.y) >= bounds.top + height * 0.72,
  );

  const topThreshold = Math.max(14, Math.max(width, height) * 0.18);
  const bottomThreshold = Math.max(14, Math.max(width, height) * 0.2);

  const hasTopDiagonal = diagonalSegments.some((segment) =>
    closestEndpointDistance(segment, verticalTop) <= topThreshold,
  );
  const hasBase = baseSegments.some((segment) =>
    closestEndpointDistance(segment, verticalBottom) <= bottomThreshold,
  );

  if (hasTopDiagonal) return true;
  if (hasTopDiagonal && hasBase) return true;
  return false;
}

function detectBitFromShape(strokes: Stroke[]): LogicBit | null {
  const bounds = getStrokesBoundingBox(strokes);
  if (!bounds) return null;

  if (strokes.length === 1 && isZeroShape(strokes, bounds)) return 0;
  if (isOneShape(strokes, bounds)) return 1;

  return null;
}

function getRecognitionText(result?: HandwritingRecognitionResult): string {
  if (!result) return '';
  if (result.rawText.trim()) return result.rawText;

  return result.lines
    .flatMap((line) => line.tokens.map((token) => token.text))
    .join('');
}

function findNearestInput(element: AndGateElement, strokeBounds: BoundingBox): number | null {
  let bestIndex: number | null = null;
  let bestDistance = Infinity;

  for (let i = 0; i < element.inputs.length; i++) {
    const outer = getInputCanvasOuterPoint(element, i);
    const attach = getInputCanvasAttachPoint(element, i);
    const targetBounds: BoundingBox = {
      left: Math.min(outer.x, attach.x) - INPUT_VALUE_MARGIN_X,
      top: attach.y - INPUT_VALUE_MARGIN_TOP,
      right: Math.max(outer.x, attach.x) + INPUT_VALUE_MARGIN_X,
      bottom: attach.y + INPUT_VALUE_MARGIN_BOTTOM,
    };
    if (!overlaps(targetBounds, strokeBounds)) continue;

    const center = {
      x: (strokeBounds.left + strokeBounds.right) / 2,
      y: (strokeBounds.top + strokeBounds.bottom) / 2,
    };
    const currentDistance = pointToSegmentDistance(center, outer, attach);
    if (currentDistance < bestDistance) {
      bestDistance = currentDistance;
      bestIndex = i;
    }
  }

  return bestDistance <= HIT_DISTANCE + INPUT_VALUE_MARGIN_TOP ? bestIndex : null;
}

function tryFindConnection(
  element: AndGateElement,
  strokes: Stroke[],
  elements: Element[],
): { inputIndex: number; sourceGateId: string } | null {
  if (strokes.length !== 1 || computeStraightness(strokes[0]) < STRAIGHTNESS_THRESHOLD) {
    return null;
  }

  const endpoints = getStrokeEndpoints(strokes);
  if (!endpoints) return null;

  for (let inputIndex = 0; inputIndex < element.inputs.length; inputIndex++) {
    const attach = getInputCanvasAttachPoint(element, inputIndex);
    const outer = getInputCanvasOuterPoint(element, inputIndex);

    const startIsInput = Math.min(distance(endpoints.start, attach), distance(endpoints.start, outer)) <= HIT_DISTANCE;
    const endIsInput = Math.min(distance(endpoints.end, attach), distance(endpoints.end, outer)) <= HIT_DISTANCE;

    if (!startIsInput && !endIsInput) continue;

    const otherPoint = startIsInput ? endpoints.end : endpoints.start;
    for (const candidate of elements) {
      if (!isAndGateElement(candidate) || candidate.id === element.id) continue;

      const outputAttach = getOutputCanvasAttachPoint(candidate);
      const outputOuter = getOutputCanvasOuterPoint(candidate);
      const nearOutput = Math.min(
        distance(otherPoint, outputAttach),
        distance(otherPoint, outputOuter),
      );

      if (nearOutput <= HIT_DISTANCE) {
        return { inputIndex, sourceGateId: candidate.id };
      }
    }
  }

  return null;
}

function applyResolvedUpdate(
  element: AndGateElement,
  updatedElement: AndGateElement,
  context?: InteractionContext,
): InteractionResult {
  if (!context) {
    const resolved = resolveAndGateElements([updatedElement]);
    const resolvedElement = resolved.elements[0];
    return {
      element: isAndGateElement(resolvedElement) ? resolvedElement : updatedElement,
      consumed: true,
      strokesConsumed: [],
    };
  }

  const baseElements = context.elements.map((current) =>
    current.id === element.id ? updatedElement : current,
  );
  const resolved = resolveAndGateElements(baseElements);
  const resolvedElement = resolved.elements.find(
    (current): current is AndGateElement => isAndGateElement(current) && current.id === element.id,
  ) ?? updatedElement;

  return {
    element: resolvedElement,
    consumed: true,
    strokesConsumed: [],
    additionalUpdatedElements: resolved.elements.filter(
      (current) => current.id !== element.id && resolved.changedIds.has(current.id),
    ),
  };
}

export function isInterestedIn(
  element: AndGateElement,
  _strokes: Stroke[],
  strokeBounds: BoundingBox,
): boolean {
  return overlaps(expand(getAndGateCanvasBounds(element), INTEREST_MARGIN), strokeBounds);
}

export async function acceptInk(
  element: AndGateElement,
  strokes: Stroke[],
  recognitionResult?: HandwritingRecognitionResult,
  context?: InteractionContext,
): Promise<InteractionResult> {
  const nearbyElements = context?.elements ?? [element];
  const connection = tryFindConnection(element, strokes, nearbyElements);
  if (connection) {
    const updatedElement: AndGateElement = {
      ...element,
      inputs: element.inputs.map((input, index) =>
        index === connection.inputIndex
          ? { ...input, manualValue: null, sourceGateId: connection.sourceGateId }
          : input,
      ),
    };

    const resolved = applyResolvedUpdate(element, updatedElement, context);
    return { ...resolved, strokesConsumed: strokes };
  }

  const center = getStrokeCenter(strokes);
  const strokeBounds = getStrokesBoundingBox(strokes);
  if (!center || !strokeBounds) {
    return { element, consumed: false, strokesConsumed: [] };
  }

  const inputIndex = findNearestInput(element, strokeBounds);
  if (inputIndex === null) {
    return { element, consumed: false, strokesConsumed: [] };
  }

  let bit = detectBitFromShape(strokes);
  if (bit === null) {
    let result = recognitionResult;
    if (!result) {
      try {
        result = await getRecognitionService().recognizeGoogle(strokes);
      } catch {
        result = undefined;
      }
    }
    bit = parseLogicBit(getRecognitionText(result));
  }

  if (bit === null) {
    return { element, consumed: false, strokesConsumed: [] };
  }

  const updatedElement: AndGateElement = {
    ...element,
    inputs: element.inputs.map((input, index) =>
      index === inputIndex
        ? {
            ...input,
            outerPoint: { x: 0, y: input.attachPoint.y },
            manualValue: bit,
            sourceGateId: null,
          }
        : input,
    ),
  };

  const resolved = applyResolvedUpdate(element, updatedElement, context);
  return { ...resolved, strokesConsumed: strokes };
}
