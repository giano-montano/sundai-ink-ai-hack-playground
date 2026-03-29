import type { Element } from '../../types';
import type { AndGateElement } from '../andgate/types';
import type { LogicInputElement } from '../logicinput/types';
import { applyMatrix } from '../../types/primitives';

/**
 * Resuelve la lógica de todos los elementos de circuito en la nota.
 */
export function solveLogic(elements: Element[]): Element[] {
  const gates = elements.filter(el => el.type === 'andgate') as AndGateElement[];
  const inputs = elements.filter(el => el.type === 'logicinput') as LogicInputElement[];

  if (gates.length === 0) return elements;

  // Fase 1: Recopilar qué inputs tocan los pines de entrada de qué compuertas
  const gateUpdates = gates.map(gate => {
    const { left, top, bottom } = gate.bounds;
    const height = bottom - top;

    const p1_world = applyMatrix(gate.transform, { x: left, y: top + height * 0.3 });
    const p2_world = applyMatrix(gate.transform, { x: left, y: top + height * 0.7 });

    let val1: 0 | 1 | null = null;
    let val2: 0 | 1 | null = null;

    for (const input of inputs) {
      const inputCenter_world = applyMatrix(input.transform, {
        x: (input.bounds.left + input.bounds.right) / 2,
        y: (input.bounds.top + input.bounds.bottom) / 2
      });

      const dist1 = Math.hypot(inputCenter_world.x - p1_world.x, inputCenter_world.y - p1_world.y);
      const dist2 = Math.hypot(inputCenter_world.x - p2_world.x, inputCenter_world.y - p2_world.y);

      if (dist1 < 25) val1 = input.value;
      if (dist2 < 25) val2 = input.value;
    }

    const output = (val1 === 1 && val2 === 1) ? 1 : 0;
    return { id: gate.id, val1, val2, output };
  });

  // Fase 2: Aplicar cambios y propagar hacia los LogicInputs que actúan como "pantalla/salida"
  // Un input es "seguidor de salida" si está pegado al pin derecho de una compuerta.
  return elements.map(el => {
    if (el.type === 'andgate') {
      const update = gateUpdates.find(u => u.id === el.id);
      return update ? { ...el, input1: update.val1, input2: update.val2, output: update.output } : el;
    }

    if (el.type === 'logicinput') {
      const input = el as LogicInputElement;
      
      // Centro actual del input en el mundo
      const inputCenter_world = applyMatrix(input.transform, {
        x: (input.bounds.left + input.bounds.right) / 2,
        y: (input.bounds.top + input.bounds.bottom) / 2
      });

      // Ver si alguna compuerta tiene su pin de salida aquí
      for (const gate of gates) {
        const gateUpdate = gateUpdates.find(u => u.id === gate.id);
        if (!gateUpdate) continue;

        const outPin_world = applyMatrix(gate.transform, {
          x: gate.bounds.right,
          y: (gate.bounds.top + gate.bounds.bottom) / 2
        });

        const distOut = Math.hypot(inputCenter_world.x - outPin_world.x, inputCenter_world.y - outPin_world.y);

        if (distOut < 25) {
          // Si el input está pegado a la salida, hereda su valor.
          // Esto lo convierte en un transmisor para la siguiente etapa.
          return { ...input, value: gateUpdate.output as 0 | 1 };
        }
      }
    }

    return el;
  });
}
