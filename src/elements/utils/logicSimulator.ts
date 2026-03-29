import type { Element } from '../../types';
import type { AndGateElement } from '../andgate/types';
import type { LogicInputElement } from '../logicinput/types';
import { boundingBoxContainsPoint, applyMatrix } from '../../types/primitives';

/**
 * Resuelve la lógica de todos los elementos de circuito en la nota.
 * Devuelve una nueva lista de elementos con los estados actualizados.
 */
export function solveLogic(elements: Element[]): Element[] {
  const gates = elements.filter(el => el.type === 'andgate') as AndGateElement[];
  const inputs = elements.filter(el => el.type === 'logicinput') as LogicInputElement[];

  if (gates.length === 0) return elements;

  const updatedElements = elements.map(el => {
    if (el.type !== 'andgate') return el;

    const gate = el as AndGateElement;
    const { left, top, right, bottom } = gate.bounds;
    const height = bottom - top;

    // Calcular posiciones REALES de los pines usando el transform
    const p1_local = { x: left, y: top + height * 0.3 };
    const p2_local = { x: left, y: top + height * 0.7 };
    
    const p1_world = applyMatrix(gate.transform, p1_local);
    const p2_world = applyMatrix(gate.transform, p2_local);

    let val1: 0 | 1 | null = null;
    let val2: 0 | 1 | null = null;

    // Buscar inputs que toquen los pines (considerando también sus transforms)
    for (const input of inputs) {
      // Nota: Simplificamos asumiendo que el input.bounds ya está en world space 
      // o que su transform es identidad para el dibujo inicial.
      // Si el input se mueve, aplicamos su transform a sus bounds.
      const inputCenter_local = {
        x: (input.bounds.left + input.bounds.right) / 2,
        y: (input.bounds.top + input.bounds.bottom) / 2
      };
      const inputCenter_world = applyMatrix(input.transform, inputCenter_local);

      // Distancia simple para la conexión (margen de 20px)
      const dist1 = Math.hypot(inputCenter_world.x - p1_world.x, inputCenter_world.y - p1_world.y);
      const dist2 = Math.hypot(inputCenter_world.x - p2_world.x, inputCenter_world.y - p2_world.y);

      if (dist1 < 25) val1 = input.value;
      if (dist2 < 25) val2 = input.value;
    }

    const output = (val1 === 1 && val2 === 1) ? 1 : 0;

    return {
      ...gate,
      input1: val1,
      input2: val2,
      output: output as 0 | 1
    };
  });

  return updatedElements;
}
