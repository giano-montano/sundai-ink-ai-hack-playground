import type { BoundingBox, Offset, TransformableElement } from '../../types/primitives';
import {
  boundingBoxFromOffsets,
  createTranslationMatrix,
  generateId,
} from '../../types/primitives';
import type { Element, Stroke } from '../../types';
import type { HandwritingRecognitionResult } from '../../recognition/RecognitionService';
import { getRecognitionService } from '../../recognition/RecognitionService';
import type {
  InteractionContext,
  InteractionResult,
  RenderOptions,
} from '../registry/ElementPlugin';
import { getStrokesBoundingBox } from '../registry/ElementRegistry';

export type LogicGateType = 'andgate' | 'orgate' | 'notgate';
export type LogicBit = 0 | 1;

export interface LogicGateInput {
  attachPoint: Offset;
  outerPoint: Offset;
  manualValue: LogicBit | null;
  sourceGateId: string | null;
}

export interface LogicGateElementBase<TType extends LogicGateType = LogicGateType> extends TransformableElement {
  type: TType;
  bounds: BoundingBox;
  bodyBounds: BoundingBox;
  inputs: LogicGateInput[];
  outputAttachPoint: Offset;
  outputOuterPoint: Offset;
  resolvedInputs: Array<LogicBit | null>;
  outputValue: LogicBit | null;
  bubbleCenter?: Offset;
  bubbleRadius?: number;
}

export type LogicGateElement = LogicGateElementBase<LogicGateType>;

const MIN_BODY_WIDTH = 60;
const MIN_BODY_HEIGHT = 56;
const INPUT_LENGTH_RATIO = 0.45;
const OUTPUT_LENGTH_RATIO = 0.55;
const NOT_BUBBLE_GAP_RATIO = 0.08;
const NOT_BUBBLE_RADIUS_RATIO = 0.1;

const INTEREST_MARGIN = 70;
const HIT_DISTANCE = 28;
const STRAIGHTNESS_THRESHOLD = 0.9;
const INPUT_VALUE_MARGIN_X = 18;
const INPUT_VALUE_MARGIN_TOP = 46;
const INPUT_VALUE_MARGIN_BOTTOM = 20;

function createInputs(bodyBounds: BoundingBox, inputCount: number): LogicGateInput[] {
  const height = bodyBounds.bottom - bodyBounds.top;
  return Array.from({ length: inputCount }, (_, index) => {
    const y = bodyBounds.top + height * ((index + 1) / (inputCount + 1));
    return {
      attachPoint: { x: bodyBounds.left, y },
      outerPoint: { x: 0, y },
      manualValue: null,
      sourceGateId: null,
    };
  });
}

export function createLogicGateElementFromBodyBounds<TType extends LogicGateType>(
  type: TType,
  bodyCanvasBounds: BoundingBox,
  inputCount: number,
  id = generateId(),
): LogicGateElementBase<TType> {
  const bodyWidth = Math.max(MIN_BODY_WIDTH, bodyCanvasBounds.right - bodyCanvasBounds.left);
  const bodyHeight = Math.max(MIN_BODY_HEIGHT, bodyCanvasBounds.bottom - bodyCanvasBounds.top);
  const inputLength = Math.max(28, bodyWidth * INPUT_LENGTH_RATIO);
  const outputLength = Math.max(32, bodyWidth * OUTPUT_LENGTH_RATIO);

  const bodyBounds: BoundingBox = {
    left: inputLength,
    top: 0,
    right: inputLength + bodyWidth,
    bottom: bodyHeight,
  };

  const centerY = bodyBounds.top + bodyHeight / 2;
  const bubbleRadius = type === 'notgate' ? Math.max(6, bodyHeight * NOT_BUBBLE_RADIUS_RATIO) : undefined;
  const bubbleGap = type === 'notgate' ? Math.max(6, bodyHeight * NOT_BUBBLE_GAP_RATIO) : 0;
  const bubbleCenter = bubbleRadius
    ? { x: bodyBounds.right + bubbleGap + bubbleRadius, y: centerY }
    : undefined;
  const outputAttachPoint = bubbleRadius && bubbleCenter
    ? { x: bubbleCenter.x + bubbleRadius, y: centerY }
    : { x: bodyBounds.right, y: centerY };
  const outputOuterPoint = {
    x: outputAttachPoint.x + outputLength,
    y: centerY,
  };

  return {
    type,
    id,
    transform: createTranslationMatrix(bodyCanvasBounds.left - inputLength, bodyCanvasBounds.top),
    bounds: {
      left: 0,
      top: 0,
      right: outputOuterPoint.x,
      bottom: bodyHeight,
    },
    bodyBounds,
    inputs: createInputs(bodyBounds, inputCount),
    outputAttachPoint,
    outputOuterPoint,
    resolvedInputs: Array.from({ length: inputCount }, () => null),
    outputValue: null,
    ...(bubbleCenter ? { bubbleCenter, bubbleRadius } : {}),
  } as LogicGateElementBase<TType>;
}

export function isLogicGateElement(element: Element | { type?: unknown }): element is LogicGateElement {
  return element.type === 'andgate' || element.type === 'orgate' || element.type === 'notgate';
}

export function toCanvasPoint(element: LogicGateElement, point: Offset): Offset {
  return {
    x: element.transform.values[6] + point.x,
    y: element.transform.values[7] + point.y,
  };
}

export function toLocalPoint(element: LogicGateElement, point: Offset): Offset {
  return {
    x: point.x - element.transform.values[6],
    y: point.y - element.transform.values[7],
  };
}

export function getBodyCanvasBounds(element: LogicGateElement): BoundingBox {
  const topLeft = toCanvasPoint(element, {
    x: element.bodyBounds.left,
    y: element.bodyBounds.top,
  });
  const bottomRight = toCanvasPoint(element, {
    x: element.bodyBounds.right,
    y: element.bodyBounds.bottom,
  });

  return {
    left: topLeft.x,
    top: topLeft.y,
    right: bottomRight.x,
    bottom: bottomRight.y,
  };
}

export function getInputCanvasAttachPoint(element: LogicGateElement, inputIndex: number): Offset {
  return toCanvasPoint(element, element.inputs[inputIndex].attachPoint);
}

export function getInputCanvasOuterPoint(element: LogicGateElement, inputIndex: number): Offset {
  return toCanvasPoint(element, element.inputs[inputIndex].outerPoint);
}

export function getOutputCanvasAttachPoint(element: LogicGateElement): Offset {
  return toCanvasPoint(element, element.outputAttachPoint);
}

export function getOutputCanvasOuterPoint(element: LogicGateElement): Offset {
  return toCanvasPoint(element, element.outputOuterPoint);
}

export function getLogicGateCanvasBounds(element: LogicGateElement): BoundingBox {
  const points: Offset[] = [
    toCanvasPoint(element, { x: element.bodyBounds.left, y: element.bodyBounds.top }),
    toCanvasPoint(element, { x: element.bodyBounds.right, y: element.bodyBounds.bottom }),
    getOutputCanvasAttachPoint(element),
    getOutputCanvasOuterPoint(element),
    ...element.inputs.flatMap((input) => [
      toCanvasPoint(element, input.attachPoint),
      toCanvasPoint(element, input.outerPoint),
    ]),
  ];

  if (element.bubbleCenter && element.bubbleRadius) {
    points.push(
      toCanvasPoint(element, {
        x: element.bubbleCenter.x - element.bubbleRadius,
        y: element.bubbleCenter.y - element.bubbleRadius,
      }),
      toCanvasPoint(element, {
        x: element.bubbleCenter.x + element.bubbleRadius,
        y: element.bubbleCenter.y + element.bubbleRadius,
      }),
    );
  }

  const box = boundingBoxFromOffsets(points);
  return box ?? {
    left: element.transform.values[6],
    top: element.transform.values[7],
    right: element.transform.values[6],
    bottom: element.transform.values[7],
  };
}

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

export function renderLogicGateWiresAndValues(
  ctx: CanvasRenderingContext2D,
  element: LogicGateElement,
  _options?: RenderOptions,
): void {
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

export function getLogicGateRenderBounds(element: LogicGateElement): BoundingBox | null {
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

  const baseBounds = getLogicGateCanvasBounds(element);
  return boundingBoxFromOffsets([
    { x: baseBounds.left, y: baseBounds.top },
    { x: baseBounds.right, y: baseBounds.bottom },
    ...valuePoints,
  ]);
}

export function parseLogicBit(text: string): LogicBit | null {
  const normalized = text.trim().replace(/\s+/g, '').toLowerCase();
  if (!normalized) return null;
  if (normalized === '0' || normalized === 'o') return 0;
  if (normalized === '1' || normalized === 'l' || normalized === 'i' || normalized === '|') return 1;
  return null;
}

function getManualOrLinkedValue(
  gate: LogicGateElement,
  inputIndex: number,
  gatesById: Map<string, LogicGateElement>,
): LogicBit | null {
  const input = gate.inputs[inputIndex];
  if (input.sourceGateId) {
    return gatesById.get(input.sourceGateId)?.outputValue ?? null;
  }
  return input.manualValue;
}

function resolveOutputValue(type: LogicGateType, values: Array<LogicBit | null>): LogicBit | null {
  if (type === 'andgate') {
    if (values.some((value) => value === 0)) return 0;
    if (values.length > 0 && values.every((value) => value === 1)) return 1;
    return null;
  }

  if (type === 'orgate') {
    if (values.some((value) => value === 1)) return 1;
    if (values.length > 0 && values.every((value) => value === 0)) return 0;
    return null;
  }

  const input = values[0];
  if (input === null) return null;
  return input === 1 ? 0 : 1;
}

function samePoint(a: Offset, b: Offset): boolean {
  return a.x === b.x && a.y === b.y;
}

function sameGateState(a: LogicGateElement, b: LogicGateElement): boolean {
  if (a.outputValue !== b.outputValue) return false;
  if (a.resolvedInputs.length !== b.resolvedInputs.length) return false;

  for (let i = 0; i < a.inputs.length; i++) {
    if (a.resolvedInputs[i] !== b.resolvedInputs[i]) return false;
    if (a.inputs[i].manualValue !== b.inputs[i].manualValue) return false;
    if (a.inputs[i].sourceGateId !== b.inputs[i].sourceGateId) return false;
    if (!samePoint(a.inputs[i].outerPoint, b.inputs[i].outerPoint)) return false;
  }

  return true;
}

export function resolveLogicGateElements(elements: Element[]): {
  elements: Element[];
  changedIds: Set<string>;
} {
  let currentElements = elements.slice();
  const changedIds = new Set<string>();
  const maxPasses = Math.max(2, elements.length * 2);

  for (let pass = 0; pass < maxPasses; pass++) {
    const gatesById = new Map(
      currentElements.filter(isLogicGateElement).map((element) => [element.id, element]),
    );

    let passChanged = false;
    currentElements = currentElements.map((element) => {
      if (!isLogicGateElement(element)) return element;

      const nextInputs = element.inputs.map((input) => {
        if (!input.sourceGateId) return input;

        const sourceGate = gatesById.get(input.sourceGateId);
        if (!sourceGate) return input;

        return {
          ...input,
          outerPoint: toLocalPoint(element, getOutputCanvasOuterPoint(sourceGate)),
        };
      });

      const nextResolved = nextInputs.map((_, index) =>
        getManualOrLinkedValue({ ...element, inputs: nextInputs }, index, gatesById),
      );
      const nextGate: LogicGateElement = {
        ...element,
        inputs: nextInputs,
        resolvedInputs: nextResolved,
        outputValue: resolveOutputValue(element.type, nextResolved),
      };

      if (sameGateState(element, nextGate)) {
        return element;
      }

      changedIds.add(element.id);
      passChanged = true;
      return nextGate;
    });

    if (!passChanged) break;
  }

  return { elements: currentElements, changedIds };
}

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

  if (segments.length === 1 && strokes.length === 1 && computeStraightness(strokes[0]) >= 0.92 && height > width * 1.4) {
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

  if (hasTopDiagonal && hasBase) return true;
  return hasTopDiagonal;
}

function detectBitFromShape(strokes: Stroke[]): LogicBit | null {
  const bounds = getStrokesBoundingBox(strokes);
  if (!bounds) return null;

  if (strokes.length === 1 && isZeroShape(strokes, bounds)) return 0;
  if (isOneShape(strokes, bounds)) return 1;
  return null;
}

function findNearestInput(element: LogicGateElement, strokeBounds: BoundingBox): number | null {
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
  element: LogicGateElement,
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
      if (!isLogicGateElement(candidate) || candidate.id === element.id) continue;

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

function getRecognitionText(result?: HandwritingRecognitionResult): string {
  if (!result) return '';
  if (result.rawText.trim()) return result.rawText;

  return result.lines
    .flatMap((line) => line.tokens.map((token) => token.text))
    .join('');
}

function applyResolvedUpdate<T extends LogicGateElement>(
  element: T,
  updatedElement: T,
  context?: InteractionContext,
): InteractionResult {
  if (!context) {
    const resolved = resolveLogicGateElements([updatedElement]);
    const resolvedElement = resolved.elements[0];
    return {
      element: isLogicGateElement(resolvedElement) ? resolvedElement : updatedElement,
      consumed: true,
      strokesConsumed: [],
    };
  }

  const baseElements = context.elements.map((current) =>
    current.id === element.id ? updatedElement : current,
  );
  const resolved = resolveLogicGateElements(baseElements);
  const resolvedElement = resolved.elements.find(
    (current): current is LogicGateElement => isLogicGateElement(current) && current.id === element.id,
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

export function isInterestedInLogicGate(
  element: LogicGateElement,
  _strokes: Stroke[],
  strokeBounds: BoundingBox,
): boolean {
  return overlaps(expand(getLogicGateCanvasBounds(element), INTEREST_MARGIN), strokeBounds);
}

export async function acceptLogicGateInk<T extends LogicGateElement>(
  element: T,
  strokes: Stroke[],
  recognitionResult?: HandwritingRecognitionResult,
  context?: InteractionContext,
): Promise<InteractionResult> {
  const nearbyElements = context?.elements ?? [element];
  const connection = tryFindConnection(element, strokes, nearbyElements);
  if (connection) {
    const updatedElement: T = {
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

  const strokeBounds = getStrokesBoundingBox(strokes);
  if (!strokeBounds) {
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

  const updatedElement: T = {
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
