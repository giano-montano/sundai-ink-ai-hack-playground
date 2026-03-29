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
