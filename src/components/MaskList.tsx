import { useId, useState } from 'react';
import type { Mask, NormalizedRect } from '../lib/types';
import { formatPercent, isUsableRect, normalizeRect } from '../lib/geometry';

interface MaskListProps {
  masks: readonly Mask[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onRemove: (id: string) => void;
  onAdd: (rect: NormalizedRect) => void;
}

export function describeMask(mask: NormalizedRect, index: number): string {
  return `黒塗り ${index + 1}: 左から ${formatPercent(mask.x)}、上から ${formatPercent(mask.y)}、幅 ${formatPercent(
    mask.w,
  )}、高さ ${formatPercent(mask.h)}`;
}

/**
 * Text representation of the masks plus a keyboard-only way to add one.
 * This is what makes the editor usable without a pointer and without
 * relying on the canvas for information.
 */
export function MaskList({ masks, canUndo, canRedo, onUndo, onRedo, onClear, onRemove, onAdd }: MaskListProps) {
  const [form, setForm] = useState({ x: '10', y: '10', w: '30', h: '10' });
  const [formError, setFormError] = useState<string | null>(null);
  const baseId = useId();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const rect = normalizeRect({
      x: Number(form.x) / 100,
      y: Number(form.y) / 100,
      w: Number(form.w) / 100,
      h: Number(form.h) / 100,
    });
    if (!isUsableRect(rect) || [form.x, form.y, form.w, form.h].some((v) => v.trim() === '' || Number.isNaN(Number(v)))) {
      setFormError('0〜100 の数値で、幅と高さは 1 以上にしてください。');
      return;
    }
    setFormError(null);
    onAdd(rect);
  };

  const field = (key: keyof typeof form, label: string) => (
    <div className="field field--inline">
      <label className="field__label" htmlFor={`${baseId}-${key}`}>
        {label}
      </label>
      <span className="field__unit-wrap">
        <input
          id={`${baseId}-${key}`}
          className="input input--num"
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          step={1}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          aria-describedby={`${baseId}-help`}
        />
        <span className="field__unit" aria-hidden="true">
          %
        </span>
      </span>
    </div>
  );

  return (
    <div className="masks">
      <div className="toolbar" role="toolbar" aria-label="黒塗りの操作">
        <button type="button" className="btn btn--ghost" onClick={onUndo} disabled={!canUndo}>
          元に戻す
        </button>
        <button type="button" className="btn btn--ghost" onClick={onRedo} disabled={!canRedo}>
          やり直す
        </button>
        <button type="button" className="btn btn--ghost" onClick={onClear} disabled={masks.length === 0}>
          すべて消す
        </button>
      </div>

      <div className="masks__status" aria-live="polite">
        {masks.length === 0 ? '黒塗りはまだありません。' : `黒塗り ${masks.length} 件`}
      </div>

      {masks.length > 0 ? (
        <ul className="mask-list" aria-label="黒塗りの一覧">
          {masks.map((m, i) => (
            <li key={m.id} className="mask-list__item">
              <span className="mask-list__text">{describeMask(m, i)}</span>
              <button
                type="button"
                className="btn btn--small btn--ghost"
                onClick={() => onRemove(m.id)}
                aria-label={`黒塗り ${i + 1} を削除`}
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <details className="disclosure">
        <summary>数値で黒塗りを追加（キーボード操作）</summary>
        <form className="numeric-form" onSubmit={submit} aria-describedby={`${baseId}-help`}>
          <p id={`${baseId}-help`} className="field__help">
            画像の幅・高さに対する割合（％）で指定します。
          </p>
          <div className="numeric-form__grid">
            {field('x', '左から')}
            {field('y', '上から')}
            {field('w', '幅')}
            {field('h', '高さ')}
          </div>
          {formError ? (
            <p className="form-error" role="alert">
              {formError}
            </p>
          ) : null}
          <button type="submit" className="btn btn--secondary">
            この範囲を黒塗り
          </button>
        </form>
      </details>
    </div>
  );
}
