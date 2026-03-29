import { generateId, IDENTITY_MATRIX } from '../../types/primitives';
import { registerPaletteEntry } from '../../palette/PaletteRegistry';
import { registerPlugin } from '../registry/ElementRegistry';
import type { ElementPlugin } from '../registry/ElementPlugin';
import { getStrokesBoundingBox } from '../registry';
import { render, getBounds } from './renderer';
import type { AndGateElement } from './types';
import { AndGateIcon } from './icon';

const andGatePlugin: ElementPlugin<AndGateElement> = {
  elementType: 'andgate',
  name: 'AND Gate',

  // Detección: 2 a 4 trazos en un área coherente
  canCreate: (strokes) => strokes.length >= 2 && strokes.length <= 4,
  
  createFromInk: async (strokes) => {
    const bounds = getStrokesBoundingBox(strokes);
    if (!bounds) return null;

    // Solo crear si el área no es absurdamente grande o pequeña
    const width = bounds.right - bounds.left;
    const height = bounds.bottom - bounds.top;
    if (width < 20 || height < 20) return null;

    return {
      elements: [{
        type: 'andgate',
        id: generateId(),
        transform: IDENTITY_MATRIX,
        bounds,
        sourceStrokes: strokes,
      }],
      consumedStrokes: strokes,
      confidence: 0.6,
    };
  },

  render,
  getBounds,
};

registerPlugin(andGatePlugin);

// Entrada en la paleta (Menú Rectángulo + X)
registerPaletteEntry({
  id: 'andgate',
  label: 'AND Gate',
  Icon: AndGateIcon,
  category: 'logic',
  onSelect: async (bounds) => {
    return {
      type: 'andgate',
      id: generateId(),
      transform: IDENTITY_MATRIX,
      bounds,
    };
  },
});

export { andGatePlugin };
