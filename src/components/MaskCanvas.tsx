import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { LoadedImage, Mask, NormalizedRect } from '../lib/types';
import { isUsableRect, rectFromPoints } from '../lib/geometry';
import { renderSafeCopy } from '../lib/render';

interface MaskCanvasProps {
  image: LoadedImage;
  masks: readonly Mask[];
  watermark: string;
  onAddMask: (rect: NormalizedRect, source: 'pointer') => void;
}

interface Point {
  x: number;
  y: number;
}

const MAX_DPR = 2;

/**
 * Interactive preview. Pointer Events cover mouse, touch and pen with one
 * code path. The canvas is purely a view: the masks themselves live in
 * React state and are also listed as text (see MaskList) so nothing
 * depends on the canvas alone.
 */
export function MaskCanvas({ image, masks, watermark, onAddMask }: MaskCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const dragRef = useRef<{ pointerId: number; start: Point } | null>(null);
  const [draft, setDraft] = useState<NormalizedRect | null>(null);

  // Track container width and derive the display size from the image's aspect ratio.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      const height = Math.round((width * image.height) / image.width);
      setSize({ width, height });
    };
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [image]);

  // Draw whenever anything changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderSafeCopy(ctx, { source: image.source, width: size.width, height: size.height, masks, watermark });

    if (draft) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(draft.x * size.width, draft.y * size.height, draft.w * size.width, draft.h * size.height);
      ctx.strokeStyle = '#c6ff3d';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(draft.x * size.width, draft.y * size.height, draft.w * size.width, draft.h * size.height);
      ctx.restore();
    }
  }, [image, masks, watermark, size, draft]);

  const localPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (dragRef.current) return; // ignore a second finger
    e.preventDefault();
    const start = localPoint(e);
    dragRef.current = { pointerId: e.pointerId, start };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // jsdom and some older browsers lack pointer capture; drawing still works.
    }
    setDraft({ x: start.x / size.width, y: start.y / size.height, w: 0, h: 0 });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.preventDefault();
    setDraft(rectFromPoints(drag.start, localPoint(e), size.width, size.height));
  };

  const finish = (e: React.PointerEvent<HTMLCanvasElement>, commit: boolean) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // see above
    }
    const rect = rectFromPoints(drag.start, localPoint(e), size.width, size.height);
    setDraft(null);
    if (commit && isUsableRect(rect)) onAddMask(rect, 'pointer');
  };

  const description = `プレビュー: ${image.fileName}。黒塗り ${masks.length} 件。${
    watermark ? `ウォーターマーク「${watermark}」を重ねています。` : 'ウォーターマークは未設定です。'
  }`;

  return (
    <div className="canvas-wrap" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="canvas"
        role="img"
        aria-label={description}
        style={{ width: size.width || '100%', height: size.height || 'auto' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finish(e, true)}
        onPointerCancel={(e) => finish(e, false)}
        onContextMenu={(e) => e.preventDefault()}
      />
      <p className="canvas-hint" aria-hidden="true">
        ドラッグで黒塗り ・ 元に戻す: ⌘Z / Ctrl+Z
      </p>
    </div>
  );
}
