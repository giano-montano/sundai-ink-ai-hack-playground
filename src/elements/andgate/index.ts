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
});

export { andGatePlugin };
