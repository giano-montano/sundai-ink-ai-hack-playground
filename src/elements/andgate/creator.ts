import type { Stroke } from '../../types';
import type { CreationContext, CreationResult } from '../registry/ElementPlugin';
import type { AndGateElement } from './types';

export function canCreate(strokes: Stroke[]): boolean {
 
  return true;
}

export async function createFromInk(
  strokes: Stroke[],
  _context: CreationContext,
): Promise<CreationResult | null> {
  return null;
}