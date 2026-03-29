import { generateId, IDENTITY_MATRIX } from '../../types/primitives';
import { registerPaletteEntry } from '../../palette/PaletteRegistry';
import { registerPlugin } from '../registry/ElementRegistry';
import type { ElementPlugin } from '../registry/ElementPlugin';
import { render, getBounds } from './renderer';
import { canCreate, createFromInk } from './creator';
import type { OrGateElement } from './types';
import { OrGateIcon } from './icon';

const orGatePlugin: ElementPlugin<OrGateElement> = {
  elementType: 'orgate',
  name: 'OR Gate',

  canCreate,
  createFromInk,

  render,
  getBounds,

  getHandles(element) {
    const { left, top, right, bottom } = element.bounds;
    return [{
      id: 'move',
      position: { x: (left + right) / 2, y: (top + bottom) / 2 },
      hitRadius: 30,
      appearance: { shape: 'square', size: 12, fillColor: 'rgba(255,100,0,0.1)', strokeColor: '#000' }
    }];
  },

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

registerPlugin(orGatePlugin);

registerPaletteEntry({
  id: 'orgate',
  label: 'OR Gate',
  Icon: OrGateIcon,
  category: 'game',
  onSelect: async (bounds, consumeStrokes) => {
    consumeStrokes();
    return {
      type: 'orgate',
      id: generateId(),
      transform: IDENTITY_MATRIX,
      bounds,
    };
  },
});

export { orGatePlugin };
