import { registerPaletteEntry } from '../../palette/PaletteRegistry';
import type { ElementPlugin } from '../registry/ElementPlugin';
import { registerPlugin } from '../registry/ElementRegistry';
import { canCreate, createFromInk } from './creator';
import { acceptInk, isInterestedIn } from './interaction';
import { render, getBounds } from './renderer';
import { OrGateIcon } from './icon';
import { createDefaultOrGateElement } from './types';
import type { OrGateElement } from './types';

const orGatePlugin: ElementPlugin<OrGateElement> = {
  elementType: 'orgate',
  name: 'OR Gate',
  canCreate,
  createFromInk,
  isInterestedIn,
  acceptInk,
  render,
  getBounds,
};

registerPlugin(orGatePlugin);

registerPaletteEntry({
  id: 'orgate',
  label: 'OR Gate',
  Icon: OrGateIcon,
  category: 'content',
  onSelect: async (bounds) => createDefaultOrGateElement(bounds),
});

export { orGatePlugin };
