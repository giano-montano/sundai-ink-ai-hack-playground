import { generateId, IDENTITY_MATRIX } from '../../types/primitives';
import { registerPaletteEntry } from '../../palette/PaletteRegistry';
import { registerPlugin } from '../registry/ElementRegistry';
import type { ElementPlugin } from '../registry/ElementPlugin';
import { render, getBounds } from './renderer';
import { canCreate, createFromInk } from './creator';
import type { AndGateElement } from './types';
import { AndGateIcon } from './icon';

/**
 * Elemento Compuerta AND (Lógica).
 * Se detecta mediante un patrón estricto: 1 cuerpo (D), 2 entradas (izquierda), 1 salida (derecha).
 */
const andGatePlugin: ElementPlugin<AndGateElement> = {
  elementType: 'andgate',
  name: 'AND Gate',

  // Delegar detección y creación
  canCreate,
  createFromInk,

  render,
  getBounds,

  // NEW: Move handle for the gate
  getHandles(element) {
    const { left, top, right, bottom } = element.bounds;
    return [{
      id: 'move',
      position: { x: (left + right) / 2, y: (top + bottom) / 2 },
      hitRadius: 30,
      appearance: { shape: 'square', size: 12, fillColor: 'rgba(0,0,0,0.1)', strokeColor: '#000' }
    }];
  },
  // FIXED: Removed 'context' and 5th argument. Matches the interface exactly.
  onHandleDrag(element, handleId, phase, point) {
    if (handleId === 'move') {
      const width = element.bounds.right - element.bounds.left;
      const height = element.bounds.bottom - element.bounds.top;
      return {
        ...element,
        bounds: {
          left: point.x - width / 2,
          top: point.y - height / 2,
          right: point.x + width / 2,
          bottom: point.y + height / 2
        }
      };
    }
    return element;
  }
};

// Registrar el plugin en el sistema central
registerPlugin(andGatePlugin);

// Registrar entrada en el menú de paleta (Gesto Rectángulo + X)
registerPaletteEntry({
  id: 'andgate',
  label: 'AND Gate',
  Icon: AndGateIcon,
  category: 'game', // Usar categoría existente para asegurar visibilidad
  onSelect: async (bounds, consumeStrokes) => {
    consumeStrokes(); // OBLIGATORIO para que el sistema añada el elemento
    return {
      type: 'andgate',
      id: generateId(),
      transform: IDENTITY_MATRIX,
      bounds,
    };
  },
}


);



export { andGatePlugin };
