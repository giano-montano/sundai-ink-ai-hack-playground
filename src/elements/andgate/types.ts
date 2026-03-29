import type {
  BoundingBox,
  Matrix,
  Offset,
  TransformableElement,
} from '../../types/primitives';
import {
  boundingBoxFromOffsets,
  createTranslationMatrix,
  generateId,
  IDENTITY_MATRIX,
} from '../../types/primitives';
import type { Element } from '../../types';

export type LogicBit = 0 | 1;

export interface AndGateInput {
  attachPoint: Offset;
  outerPoint: Offset;
  manualValue: LogicBit | null;
  sourceGateId: string | null;
}

export interface AndGateElement extends TransformableElement {
  type: 'andgate';
  bounds: BoundingBox;
  bodyBounds: BoundingBox;
  inputs: AndGateInput[];
  outputAttachPoint: Offset;
  outputOuterPoint: Offset;
  resolvedInputs: Array<LogicBit | null>;
  outputValue: LogicBit | null;
}

const MIN_BODY_WIDTH = 60;
const MIN_BODY_HEIGHT = 56;
const INPUT_LENGTH_RATIO = 0.45;
const OUTPUT_LENGTH_RATIO = 0.55;

function createInputs(bodyBounds: BoundingBox): AndGateInput[] {
  const height = bodyBounds.bottom - bodyBounds.top;
  const xs = bodyBounds.left;
  const ys = [bodyBounds.top + height * 0.33, bodyBounds.top + height * 0.67];

  return ys.map((y) => ({
    attachPoint: { x: xs, y },
    outerPoint: { x: 0, y },
    manualValue: null,
    sourceGateId: null,
  }));
}

export function createAndGateElementFromBodyBounds(
  bodyCanvasBounds: BoundingBox,
  id = generateId(),
): AndGateElement {
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

  return {
    type: 'andgate',
    id,
    transform: createTranslationMatrix(bodyCanvasBounds.left - inputLength, bodyCanvasBounds.top),
    bounds: {
      left: 0,
      top: 0,
      right: inputLength + bodyWidth + outputLength,
      bottom: bodyHeight,
    },
    bodyBounds,
    inputs: createInputs(bodyBounds),
    outputAttachPoint: {
      x: bodyBounds.right,
      y: bodyBounds.top + bodyHeight / 2,
    },
    outputOuterPoint: {
      x: inputLength + bodyWidth + outputLength,
      y: bodyBounds.top + bodyHeight / 2,
    },
    resolvedInputs: [null, null],
    outputValue: null,
  };
}

export function createDefaultAndGateElement(bounds: BoundingBox): AndGateElement {
  return createAndGateElementFromBodyBounds(bounds);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toOffset(value: unknown, fallback: Offset): Offset {
  if (!isRecord(value)) return fallback;
  return {
    x: toNumber(value.x, fallback.x),
    y: toNumber(value.y, fallback.y),
  };
}

function toBoundingBox(value: unknown): BoundingBox | null {
  if (!isRecord(value)) return null;

  const left = toNumber(value.left, NaN);
  const top = toNumber(value.top, NaN);
  const right = toNumber(value.right, NaN);
  const bottom = toNumber(value.bottom, NaN);
  if (![left, top, right, bottom].every(Number.isFinite)) return null;

  return { left, top, right, bottom };
}

function toMatrix(value: unknown): Matrix {
  if (!isRecord(value) || !Array.isArray(value.values) || value.values.length !== 9) {
    return IDENTITY_MATRIX;
  }

  const values = value.values.map((item, index) =>
    toNumber(item, IDENTITY_MATRIX.values[index]),
  ) as Matrix['values'];

  return { values };
}

function canvasBoundsFromLocalBounds(bounds: BoundingBox, transform: Matrix): BoundingBox {
  return {
    left: transform.values[6] + bounds.left,
    top: transform.values[7] + bounds.top,
    right: transform.values[6] + bounds.right,
    bottom: transform.values[7] + bounds.bottom,
  };
}

function normalizeInputs(
  rawInputs: unknown,
  fallbackInputs: AndGateInput[],
): AndGateInput[] {
  if (!Array.isArray(rawInputs) || rawInputs.length === 0) return fallbackInputs;

  return fallbackInputs.map((fallbackInput, index) => {
    const rawInput = rawInputs[index];
    if (!isRecord(rawInput)) return fallbackInput;

    return {
      attachPoint: toOffset(rawInput.attachPoint, fallbackInput.attachPoint),
      outerPoint: toOffset(rawInput.outerPoint, fallbackInput.outerPoint),
      manualValue: rawInput.manualValue === 0 || rawInput.manualValue === 1 ? rawInput.manualValue : null,
      sourceGateId: typeof rawInput.sourceGateId === 'string' ? rawInput.sourceGateId : null,
    };
  });
}

export function normalizeAndGateElement(value: unknown): AndGateElement | null {
  if (!isRecord(value)) return null;

  const id = typeof value.id === 'string' ? value.id : generateId();
  const transform = toMatrix(value.transform);

  const fallbackCanvasBounds = canvasBoundsFromLocalBounds(
    toBoundingBox(value.bounds) ?? { left: 0, top: 0, right: 120, bottom: 80 },
    transform,
  );

  const bodyCanvasBounds = value.bodyBounds
    ? canvasBoundsFromLocalBounds(
        toBoundingBox(value.bodyBounds) ?? { left: 28, top: 0, right: 96, bottom: 80 },
        transform,
      )
    : fallbackCanvasBounds;

  const fallback = createAndGateElementFromBodyBounds(bodyCanvasBounds, id);
  const inputs = normalizeInputs(value.inputs, fallback.inputs);
  const rawResolvedInputs = Array.isArray(value.resolvedInputs) ? value.resolvedInputs : null;
  const resolvedInputs = rawResolvedInputs
    ? fallback.resolvedInputs.map((_, index) =>
        rawResolvedInputs[index] === 0 || rawResolvedInputs[index] === 1
          ? rawResolvedInputs[index]
          : null,
      )
    : inputs.map((input) => input.manualValue);

  return {
    ...fallback,
    transform,
    bounds: toBoundingBox(value.bounds) ?? fallback.bounds,
    bodyBounds: toBoundingBox(value.bodyBounds) ?? fallback.bodyBounds,
    inputs,
    outputAttachPoint: toOffset(value.outputAttachPoint, fallback.outputAttachPoint),
    outputOuterPoint: toOffset(value.outputOuterPoint, fallback.outputOuterPoint),
    resolvedInputs,
    outputValue: value.outputValue === 0 || value.outputValue === 1 ? value.outputValue : null,
  };
}

export function isAndGateElement(element: Element): element is AndGateElement {
  return element.type === 'andgate';
}

export function toCanvasPoint(element: AndGateElement, point: Offset): Offset {
  return {
    x: element.transform.values[6] + point.x,
    y: element.transform.values[7] + point.y,
  };
}

export function toLocalPoint(element: AndGateElement, point: Offset): Offset {
  return {
    x: point.x - element.transform.values[6],
    y: point.y - element.transform.values[7],
  };
}

export function getBodyCanvasBounds(element: AndGateElement): BoundingBox {
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

export function getInputCanvasAttachPoint(element: AndGateElement, inputIndex: number): Offset {
  return toCanvasPoint(element, element.inputs[inputIndex].attachPoint);
}

export function getInputCanvasOuterPoint(element: AndGateElement, inputIndex: number): Offset {
  return toCanvasPoint(element, element.inputs[inputIndex].outerPoint);
}

export function getOutputCanvasAttachPoint(element: AndGateElement): Offset {
  return toCanvasPoint(element, element.outputAttachPoint);
}

export function getOutputCanvasOuterPoint(element: AndGateElement): Offset {
  return toCanvasPoint(element, element.outputOuterPoint);
}

export function getAndGateCanvasBounds(element: AndGateElement): BoundingBox {
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

  const box = boundingBoxFromOffsets(points);
  return box ?? {
    left: element.transform.values[6],
    top: element.transform.values[7],
    right: element.transform.values[6],
    bottom: element.transform.values[7],
  };
}
