import type { Mask, NormalizedRect } from './types';
import { isUsableRect, normalizeRect } from './geometry';

/**
 * Mask state is a plain, immutable structure handled by a reducer so that
 * it can be unit-tested without a DOM and rendered from React with
 * `useReducer`.
 */
export interface MaskState {
  masks: Mask[];
  /** Undone masks, most recent last. Cleared when a new mask is added. */
  redoStack: Mask[];
}

export type MaskAction =
  | { type: 'add'; rect: NormalizedRect; source: Mask['source']; id?: string }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'remove'; id: string }
  | { type: 'clear' };

export const initialMaskState: MaskState = { masks: [], redoStack: [] };

let counter = 0;
export function createMaskId(): string {
  counter += 1;
  return `mask-${Date.now().toString(36)}-${counter}`;
}

export function maskReducer(state: MaskState, action: MaskAction): MaskState {
  switch (action.type) {
    case 'add': {
      const rect = normalizeRect(action.rect);
      if (!isUsableRect(rect)) return state;
      const mask: Mask = { ...rect, id: action.id ?? createMaskId(), source: action.source };
      return { masks: [...state.masks, mask], redoStack: [] };
    }
    case 'undo': {
      if (state.masks.length === 0) return state;
      const masks = state.masks.slice(0, -1);
      const undone = state.masks[state.masks.length - 1] as Mask;
      return { masks, redoStack: [...state.redoStack, undone] };
    }
    case 'redo': {
      if (state.redoStack.length === 0) return state;
      const redoStack = state.redoStack.slice(0, -1);
      const restored = state.redoStack[state.redoStack.length - 1] as Mask;
      return { masks: [...state.masks, restored], redoStack };
    }
    case 'remove': {
      const masks = state.masks.filter((m) => m.id !== action.id);
      if (masks.length === state.masks.length) return state;
      return { ...state, masks };
    }
    case 'clear':
      return initialMaskState;
    default:
      return state;
  }
}
