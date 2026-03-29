import type { Element } from '../../types';
import type { BoundingBox } from '../../types/primitives';
import {
  createLogicGateElementFromBodyBounds,
  getBodyCanvasBounds,
  getInputCanvasAttachPoint,
  getInputCanvasOuterPoint,
  getLogicGateCanvasBounds,
  getOutputCanvasAttachPoint,
  getOutputCanvasOuterPoint,
  toCanvasPoint,
  toLocalPoint,
  type LogicBit,
  type LogicGateElementBase,
  type LogicGateInput,
} from '../logicgate/shared';

export type { LogicBit };
export type OrGateInput = LogicGateInput;
export interface OrGateElement extends LogicGateElementBase<'orgate'> {}

export function createOrGateElementFromBodyBounds(
  bodyCanvasBounds: BoundingBox,
  id?: string,
): OrGateElement {
  const element = createLogicGateElementFromBodyBounds('orgate', bodyCanvasBounds, 2, id) as OrGateElement;
  const width = element.bodyBounds.right - element.bodyBounds.left;
  const attachX = element.bodyBounds.left + width * 0.18;

  return {
    ...element,
    inputs: element.inputs.map((input) => ({
      ...input,
      attachPoint: { x: attachX, y: input.attachPoint.y },
    })),
  };
}

export function createDefaultOrGateElement(bounds: BoundingBox): OrGateElement {
  return createOrGateElementFromBodyBounds(bounds);
}

export function isOrGateElement(element: Element): element is OrGateElement {
  return element.type === 'orgate';
}

export {
  getBodyCanvasBounds,
  getInputCanvasAttachPoint,
  getInputCanvasOuterPoint,
  getOutputCanvasAttachPoint,
  getOutputCanvasOuterPoint,
  toCanvasPoint,
  toLocalPoint,
};

export function getOrGateCanvasBounds(element: OrGateElement): BoundingBox {
  return getLogicGateCanvasBounds(element);
}
