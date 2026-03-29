import { registerPaletteEntry } from '../../palette/PaletteRegistry';
import type { ElementPlugin } from '../registry/ElementPlugin';
import { registerPlugin } from '../registry/ElementRegistry';
import { canCreate, createFromInk } from './creator';
import { acceptInk, isInterestedIn } from './interaction';
import { render, getBounds } from './renderer';
import { NotGateIcon } from './icon';
import { createDefaultNotGateElement } from './types';
import type { NotGateElement } from './types';

const notGatePlugin: ElementPlugin<NotGateElement> = {
  elementType: 'notgate',
  name: 'NOT Gate',
  canCreate,
  createFromInk,
  isInterestedIn,
  acceptInk,
  render,
  getBounds,
};

registerPlugin(notGatePlugin);

registerPaletteEntry({
  id: 'notgate',
  label: 'NOT Gate',
  Icon: NotGateIcon,
  category: 'content',
  onSelect: async (bounds) => createDefaultNotGateElement(bounds),
});

export { notGatePlugin };
