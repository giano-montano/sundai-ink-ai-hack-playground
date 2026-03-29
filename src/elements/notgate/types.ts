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
export type NotGateInput = LogicGateInput;
export interface NotGateElement extends LogicGateElementBase<'notgate'> {}

export function createNotGateElementFromBodyBounds(
  bodyCanvasBounds: BoundingBox,
  id?: string,
): NotGateElement {
  return createLogicGateElementFromBodyBounds('notgate', bodyCanvasBounds, 1, id) as NotGateElement;
}

export function createDefaultNotGateElement(bounds: BoundingBox): NotGateElement {
  return createNotGateElementFromBodyBounds(bounds);
}

export function isNotGateElement(element: Element): element is NotGateElement {
  return element.type === 'notgate';
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

export function getNotGateCanvasBounds(element: NotGateElement): BoundingBox {
  return getLogicGateCanvasBounds(element);
}
