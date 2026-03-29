import type { Element } from '../../types';
import type { AndGateElement } from '../andgate/types';
import type { LogicInputElement } from '../logicinput/types';
import { applyMatrix, boundingBoxContainsPoint, expandBoundingBox } from '../../types/primitives';

/**
 * Resuelve la lógica de todos los elementos de circuito en la nota.
 */
export function solveLogic(elements: Element[]): Element[] {
  const gates = elements.filter(el => el.type === 'andgate') as AndGateElement[];
  const inputs = elements.filter(el => el.type === 'logicinput') as LogicInputElement[];

  if (gates.length === 0) return elements;

  // Fase 1: Sincronizar posición de los outputs "sticky"
  const syncElements = elements.map(el => {
    if (el.type === 'logicinput') {
      const input = el as LogicInputElement;
      if (input.outputOf) {
        const parentGate = gates.find(g => g.id === input.outputOf);
        if (parentGate) {
          // Reposicionar el output pegado al pin derecho del padre
          const gateWidth = parentGate.bounds.right - parentGate.bounds.left;
          const gateHeight = parentGate.bounds.bottom - parentGate.bounds.top;
          const outWidth = input.bounds.right - input.bounds.left;
          const outHeight = input.bounds.bottom - input.bounds.top;
          
          // El outputOf debe seguir al padre, manteniendo su offset relativo
          // Para simplificar, lo pegamos siempre a 5px del borde derecho central
          const outputPadding = 5;
          const newLeft = parentGate.bounds.right + outputPadding;
          const newTop = parentGate.bounds.top + gateHeight / 2 - outHeight / 2;

          return {
            ...input,
            transform: parentGate.transform, // Hereda el transform del padre
            bounds: {
              left: newLeft,
              top: newTop,
              right: newLeft + outWidth,
              bottom: newTop + outHeight
            }
          };
        }
      }
    }
    return el;
  });

  // Fase 2: Recopilar qué inputs tocan los pines de entrada de qué compuertas
  const gateUpdates = gates.map(gate => {
    const { left, top, bottom } = gate.bounds;
    const height = bottom - top;

    // Posición mundial de los pines de entrada
    const p1_world = applyMatrix(gate.transform, { x: left, y: top + height * 0.3 });
    const p2_world = applyMatrix(gate.transform, { x: left, y: top + height * 0.7 });

    let val1: 0 | 1 | null = null;
    let val2: 0 | 1 | null = null;

    for (const input of inputs) {
      // No podemos conectarnos a nuestro propio output (feedback loop simple prevenido)
      if (input.outputOf === gate.id) continue;

      // Expandimos la caja de colisión del input para que sea más fácil conectar (margen de 15px)
      const collisionBounds = expandBoundingBox(input.bounds, 15);
      
      // Centro del input en el mundo
      const inputCenter_local = {
        x: (input.bounds.left + input.bounds.right) / 2,
        y: (input.bounds.top + input.bounds.bottom) / 2
      };
      const inputCenter_world = applyMatrix(input.transform, inputCenter_local);

      // Verificamos si el pin está DENTRO de la caja del input expandida
      // O si el centro del input está muy cerca del pin
      const isConnected1 = boundingBoxContainsPoint(collisionBounds, p1_world);
      const isConnected2 = boundingBoxContainsPoint(collisionBounds, p2_world);
      
      const dist1 = Math.hypot(inputCenter_world.x - p1_world.x, inputCenter_world.y - p1_world.y);
      const dist2 = Math.hypot(inputCenter_world.x - p2_world.x, inputCenter_world.y - p2_world.y);

      if (isConnected1 || dist1 < 35) val1 = input.value;
      if (isConnected2 || dist2 < 35) val2 = input.value;
    }

    const output = (val1 === 1 && val2 === 1) ? 1 : 0;
    return { id: gate.id, val1, val2, output };
  });

  // Fase 3: Propagar el output a los seguidores
  return syncElements.map(el => {
    if (el.type === 'andgate') {
      const update = gateUpdates.find(u => u.id === el.id);
      return update ? { ...el, input1: update.val1, input2: update.val2, output: update.output } : el;
    }

    if (el.type === 'logicinput') {
      const input = el as LogicInputElement;
      
      // Si es un output seguidor, actualizamos su valor basado en su padre
      if (input.outputOf) {
        const gateUpdate = gateUpdates.find(u => u.id === input.outputOf);
        if (gateUpdate) {
          return { ...input, value: gateUpdate.output as 0 | 1 };
        }
      }

      // Para inputs sueltos, también permitimos que se conecten manualmente (Legacy check)
      const inputCenter_world = applyMatrix(input.transform, {
        x: (input.bounds.left + input.bounds.right) / 2,
        y: (input.bounds.top + input.bounds.bottom) / 2
      });

      for (const gate of gates) {
        const gateUpdate = gateUpdates.find(u => u.id === gate.id);
        if (!gateUpdate) continue;

        const outPin_world = applyMatrix(gate.transform, {
          x: gate.bounds.right,
          y: (gate.bounds.top + gate.bounds.bottom) / 2
        });

        const distOut = Math.hypot(inputCenter_world.x - outPin_world.x, inputCenter_world.y - outPin_world.y);
        if (distOut < 35) {
          return { ...input, value: gateUpdate.output as 0 | 1 };
        }
      }
    }

    return el;
  });
}
