import type { Element, Offset } from '../../types';
import type { AndGateElement, LogicBit } from './types';
import {
  getOutputCanvasOuterPoint,
  isAndGateElement,
  toLocalPoint,
} from './types';

function getManualOrLinkedValue(
  gate: AndGateElement,
  inputIndex: number,
  gatesById: Map<string, AndGateElement>,
): LogicBit | null {
  const input = gate.inputs[inputIndex];
  if (input.sourceGateId) {
    return gatesById.get(input.sourceGateId)?.outputValue ?? null;
  }
  return input.manualValue;
}

function resolveOutput(values: Array<LogicBit | null>): LogicBit | null {
  if (values.some((value) => value === 0)) return 0;
  if (values.length > 0 && values.every((value) => value === 1)) return 1;
  return null;
}

function samePoint(a: Offset, b: Offset): boolean {
  return a.x === b.x && a.y === b.y;
}

function sameGateState(a: AndGateElement, b: AndGateElement): boolean {
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

export function parseLogicBit(text: string): LogicBit | null {
  const normalized = text.trim().replace(/\s+/g, '').toLowerCase();
  if (!normalized) return null;
  if (normalized === '0' || normalized === 'o') return 0;
  if (normalized === '1' || normalized === 'l' || normalized === 'i' || normalized === '|') return 1;
  return null;
}

export function resolveAndGateElements(elements: Element[]): {
  elements: Element[];
  changedIds: Set<string>;
} {
  let currentElements = elements.slice();
  const changedIds = new Set<string>();
  const maxPasses = Math.max(2, elements.length * 2);

  for (let pass = 0; pass < maxPasses; pass++) {
    const gatesById = new Map(
      currentElements.filter(isAndGateElement).map((element) => [element.id, element]),
    );

    let passChanged = false;
    currentElements = currentElements.map((element) => {
      if (!isAndGateElement(element)) return element;

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
      const nextGate: AndGateElement = {
        ...element,
        inputs: nextInputs,
        resolvedInputs: nextResolved,
        outputValue: resolveOutput(nextResolved),
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
