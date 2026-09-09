import { describe, expect, it } from 'vitest';
import { initialMaskState, maskReducer, type MaskState } from './masks';

const rect = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });

describe('maskReducer', () => {
  it('adds a mask rectangle', () => {
    const next = maskReducer(initialMaskState, { type: 'add', rect: rect(0.1, 0.2, 0.3, 0.1), source: 'pointer' });
    expect(next.masks).toHaveLength(1);
    expect(next.masks[0]).toMatchObject({ x: 0.1, y: 0.2, w: 0.3, h: 0.1, source: 'pointer' });
    expect(next.masks[0]?.id).toBeTruthy();
  });

  it('ignores rectangles that are too small to be intentional', () => {
    const next = maskReducer(initialMaskState, { type: 'add', rect: rect(0.5, 0.5, 0.001, 0.001), source: 'pointer' });
    expect(next).toBe(initialMaskState);
  });

  it('clamps rectangles to the image bounds', () => {
    const next = maskReducer(initialMaskState, { type: 'add', rect: rect(0.9, 0.9, 0.5, 0.5), source: 'keyboard' });
    expect(next.masks[0]).toMatchObject({ x: 0.9, y: 0.9 });
    expect(next.masks[0]?.w).toBeCloseTo(0.1);
    expect(next.masks[0]?.h).toBeCloseTo(0.1);
  });

  it('undoes the most recent mask and can redo it', () => {
    let state: MaskState = initialMaskState;
    state = maskReducer(state, { type: 'add', rect: rect(0, 0, 0.2, 0.2), source: 'pointer', id: 'a' });
    state = maskReducer(state, { type: 'add', rect: rect(0.5, 0.5, 0.2, 0.2), source: 'pointer', id: 'b' });
    expect(state.masks.map((m) => m.id)).toEqual(['a', 'b']);

    state = maskReducer(state, { type: 'undo' });
    expect(state.masks.map((m) => m.id)).toEqual(['a']);
    expect(state.redoStack.map((m) => m.id)).toEqual(['b']);

    state = maskReducer(state, { type: 'redo' });
    expect(state.masks.map((m) => m.id)).toEqual(['a', 'b']);
    expect(state.redoStack).toHaveLength(0);
  });

  it('undo on an empty stack is a no-op', () => {
    expect(maskReducer(initialMaskState, { type: 'undo' })).toBe(initialMaskState);
    expect(maskReducer(initialMaskState, { type: 'redo' })).toBe(initialMaskState);
  });

  it('adding a new mask discards the redo stack', () => {
    let state: MaskState = initialMaskState;
    state = maskReducer(state, { type: 'add', rect: rect(0, 0, 0.2, 0.2), source: 'pointer', id: 'a' });
    state = maskReducer(state, { type: 'undo' });
    state = maskReducer(state, { type: 'add', rect: rect(0.1, 0.1, 0.2, 0.2), source: 'pointer', id: 'c' });
    expect(state.redoStack).toHaveLength(0);
    expect(state.masks.map((m) => m.id)).toEqual(['c']);
  });

  it('removes a specific mask by id and clears everything', () => {
    let state: MaskState = initialMaskState;
    state = maskReducer(state, { type: 'add', rect: rect(0, 0, 0.2, 0.2), source: 'pointer', id: 'a' });
    state = maskReducer(state, { type: 'add', rect: rect(0.5, 0.5, 0.2, 0.2), source: 'pointer', id: 'b' });
    state = maskReducer(state, { type: 'remove', id: 'a' });
    expect(state.masks.map((m) => m.id)).toEqual(['b']);
    expect(maskReducer(state, { type: 'remove', id: 'zzz' })).toBe(state);
    expect(maskReducer(state, { type: 'clear' })).toEqual(initialMaskState);
  });
});
