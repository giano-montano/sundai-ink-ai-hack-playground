import type { Element } from '../../types';
import type { AndGateElement } from '../andgate/types';
import type { OrGateElement } from '../orgate/types';
import type { NotGateElement } from '../notgate/types';
import type { LogicInputElement } from '../logicinput/types';
import { applyMatrix, boundingBoxContainsPoint, expandBoundingBox } from '../../types/primitives';

/**
 * Resuelve la lógica de todos los elementos de circuito en la nota.
 */
export function solveLogic(elements: Element[]): Element[] {
  const gates = elements.filter(el => ['andgate', 'orgate', 'notgate'].includes(el.type)) as (AndGateElement | OrGateElement | NotGateElement)[];
  const inputs = elements.filter(el => el.type === 'logicinput') as LogicInputElement[];

  if (gates.length === 0) return elements;

  // Fase 1: Sincronizar posición de los outputs "sticky"
  // Esto asegura que el LogicInput generado por una compuerta siempre la siga.
  const syncElements = elements.map(el => {
    if (el.type === 'logicinput') {
      const input = el as LogicInputElement;
      if (input.outputOf) {
        const parentGate = gates.find(g => g.id === input.outputOf);
        if (parentGate) {
          const gateHeight = parentGate.bounds.bottom - parentGate.bounds.top;
          const outWidth = input.bounds.right - input.bounds.left;
          const outHeight = input.bounds.bottom - input.bounds.top;
          
          const outputPadding = 5;
          const newLeft = parentGate.bounds.right + outputPadding;
          const newTop = parentGate.bounds.top + gateHeight / 2 - outHeight / 2;

          return {
            ...input,
            transform: parentGate.transform, // Sincroniza matriz de transformación
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

    let val1: 0 | 1 | null = null;
    let val2: 0 | 1 | null = null;
    let output: 0 | 1 = 0;

    // Diferenciar lógica por tipo de compuerta
    if (gate.type === 'andgate' || gate.type === 'orgate') {
      const p1_world = applyMatrix(gate.transform, { x: left, y: top + height * 0.3 });
      const p2_world = applyMatrix(gate.transform, { x: left, y: top + height * 0.7 });

      for (const input of inputs) {
        if (input.outputOf === gate.id) continue;
        
        // Calcular los bounds MUNDIALES del input para la colisión
        const topLeft_world = applyMatrix(input.transform, { x: input.bounds.left, y: input.bounds.top });
        const bottomRight_world = applyMatrix(input.transform, { x: input.bounds.right, y: input.bounds.bottom });
        const worldBounds = {
          left: Math.min(topLeft_world.x, bottomRight_world.x),
          top: Math.min(topLeft_world.y, bottomRight_world.y),
          right: Math.max(topLeft_world.x, bottomRight_world.x),
          bottom: Math.max(topLeft_world.y, bottomRight_world.y)
        };
        const collisionBounds = expandBoundingBox(worldBounds, 30); // Más generoso (30px)

        const inputCenter_world = applyMatrix(input.transform, {
          x: (input.bounds.left + input.bounds.right) / 2,
          y: (input.bounds.top + input.bounds.bottom) / 2
        });

        const isConnected1 = boundingBoxContainsPoint(collisionBounds, p1_world) || 
                            Math.hypot(inputCenter_world.x - p1_world.x, inputCenter_world.y - p1_world.y) < 50;
        const isConnected2 = boundingBoxContainsPoint(collisionBounds, p2_world) || 
                            Math.hypot(inputCenter_world.x - p2_world.x, inputCenter_world.y - p2_world.y) < 50;

        if (isConnected1) val1 = input.value;
        if (isConnected2) val2 = input.value;
      }

      if (gate.type === 'andgate') {
        output = (val1 === 1 && val2 === 1) ? 1 : 0;
      } else {
        output = (val1 === 1 || val2 === 1) ? 1 : 0;
      }
    } else if (gate.type === 'notgate') {
      const p_world = applyMatrix(gate.transform, { x: left, y: top + height / 2 });
      for (const input of inputs) {
        if (input.outputOf === gate.id) continue;
        
        const topLeft_world = applyMatrix(input.transform, { x: input.bounds.left, y: input.bounds.top });
        const bottomRight_world = applyMatrix(input.transform, { x: input.bounds.right, y: input.bounds.bottom });
        const worldBounds = {
          left: Math.min(topLeft_world.x, bottomRight_world.x),
          top: Math.min(topLeft_world.y, bottomRight_world.y),
          right: Math.max(topLeft_world.x, bottomRight_world.x),
          bottom: Math.max(topLeft_world.y, bottomRight_world.y)
        };
        const collisionBounds = expandBoundingBox(worldBounds, 30);
        
        const inputCenter_world = applyMatrix(input.transform, {
          x: (input.bounds.left + input.bounds.right) / 2,
          y: (input.bounds.top + input.bounds.bottom) / 2
        });

        if (boundingBoxContainsPoint(collisionBounds, p_world) || Math.hypot(inputCenter_world.x - p_world.x, inputCenter_world.y - p_world.y) < 50) {
          val1 = input.value;
        }
      }
      output = val1 === 1 ? 0 : 1; 
    }

    return { id: gate.id, type: gate.type, val1, val2, output };
  });

  // Fase 3: Propagar el output a los seguidores
  return syncElements.map(el => {
    if (['andgate', 'orgate', 'notgate'].includes(el.type)) {
      const update = gateUpdates.find(u => u.id === el.id);
      if (update) {
        if (el.type === 'notgate') {
          return { ...el, input: update.val1, output: update.output } as NotGateElement;
        } else {
          return { ...el, input1: update.val1, input2: update.val2, output: update.output };
        }
      }
    }

    if (el.type === 'logicinput') {
      const input = el as LogicInputElement;
      if (input.outputOf) {
        const gateUpdate = gateUpdates.find(u => u.id === input.outputOf);
        if (gateUpdate) return { ...input, value: gateUpdate.output as 0 | 1 };
      }

      // Check legacy/manual connections
      const inputCenter_world = applyMatrix(input.transform, {
        x: (input.bounds.left + input.bounds.right) / 2,
        y: (input.bounds.top + input.bounds.bottom) / 2
      });

      for (const gate of gates) {
        const outPin_world = applyMatrix(gate.transform, {
          x: gate.bounds.right,
          y: (gate.bounds.top + gate.bounds.bottom) / 2
        });
        if (Math.hypot(inputCenter_world.x - outPin_world.x, inputCenter_world.y - outPin_world.y) < 50) {
          const update = gateUpdates.find(u => u.id === gate.id);
          if (update) return { ...input, value: update.output as 0 | 1 };
        }
      }
    }

    return el;
  });
}
