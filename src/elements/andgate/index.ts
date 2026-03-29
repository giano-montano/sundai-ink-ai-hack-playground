import type { AndGateElement } from './types';
import type { ElementPlugin } from '../registry/ElementPlugin';
import { registerPlugin } from '../registry/ElementRegistry';
import { render, getBounds } from './renderer';
import { canCreate, createFromInk } from './creator';
import { isInterestedIn} from './interaction';

const andGatePlugin: ElementPlugin<AndGateElement> = {
  elementType: 'andgate',
  name: 'AND Gate',

  // Creation
  canCreate,
  createFromInk,

  // Interaction (only include if implemented)
  isInterestedIn,  

  // Render
  render,
  getBounds,
};

registerPlugin(andGatePlugin);

export { andGatePlugin };
