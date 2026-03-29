import { registerPaletteEntry } from '../../palette/PaletteRegistry';
import type { ElementPlugin } from '../registry/ElementPlugin';
import { registerPlugin } from '../registry/ElementRegistry';
import { canCreate, createFromInk } from './creator';
import { acceptInk, isInterestedIn } from './interaction';
import { render, getBounds } from './renderer';
import { AndGateIcon } from './icon';
import { createDefaultAndGateElement } from './types';
import type { AndGateElement } from './types';

const andGatePlugin: ElementPlugin<AndGateElement> = {
  elementType: 'andgate',
  name: 'AND Gate',
  canCreate,
  createFromInk,
  isInterestedIn,
  acceptInk,
  render,
  getBounds,
};

registerPlugin(andGatePlugin);

registerPaletteEntry({
  id: 'andgate',
  label: 'AND Gate',
  Icon: AndGateIcon,
  category: 'content',
  onSelect: async (bounds) => createDefaultAndGateElement(bounds),
});

export { andGatePlugin };
