import { generateId, IDENTITY_MATRIX } from '../../types/primitives';
import { registerPaletteEntry } from '../../palette/PaletteRegistry';
import { registerPlugin } from '../registry/ElementRegistry';
import type { ElementPlugin } from '../registry/ElementPlugin';
import { render, getBounds } from './renderer';
import { canCreate, createFromInk } from './creator';
import { isInterestedIn, acceptInk } from './interaction';
import type { LogicInputElement } from './types';
import { LogicInputIcon } from './icon';

const logicInputPlugin: ElementPlugin<LogicInputElement> = {
  elementType: 'logicinput',
  name: 'Logic Input',

  canCreate,
  createFromInk,

  isInterestedIn,
  acceptInk,

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

registerPlugin(logicInputPlugin);

registerPaletteEntry({
  id: 'logicinput',
  label: 'Logic Input',
  Icon: LogicInputIcon,
  category: 'game', // Usar categoría existente
  onSelect: async (bounds, consumeStrokes) => {
    consumeStrokes(); // OBLIGATORIO
    return {
      type: 'logicinput',
      id: generateId(),
      transform: IDENTITY_MATRIX,
      bounds,
      value: 0,
    };
  },
});

export { logicInputPlugin };
