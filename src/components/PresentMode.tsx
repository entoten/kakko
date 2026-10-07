import { useCallback, useEffect, useRef, useState } from 'react';
import type { LoadedImage, Mask, SubmissionDetails } from '../lib/types';
import { renderSafeCopy } from '../lib/render';
import { buildPresentWatermark, formatRemaining, formatTime, PRESENT_TIMEOUT_MS } from '../lib/present';

interface PresentModeProps {
  image: LoadedImage;
  masks: readonly Mask[];
  details: SubmissionDetails;
  onClose: () => void;
}

const MAX_DPR = 2;

/**
 * Full-screen overlay that shows the masked document without creating a
 * file. The watermark is redrawn every second with the current time, the
 * image starts covered and is revealed by a tap, the screen is kept awake
 * while open, and the overlay closes itself after PRESENT_TIMEOUT_MS.
 */
export function PresentMode({ image, masks, details, onClose }: PresentModeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [now, setNow] = useState(() => new Date());
  const [revealed, setRevealed] = useState(false);
  const [openedAt] = useState(() => Date.now());
  const remaining = Math.max(0, openedAt + PRESENT_TIMEOUT_MS - now.getTime());

  // Tick once a second: drives both the DOM clock and the canvas watermark.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Auto-close.
  useEffect(() => {
    if (remaining === 0) onClose();
  }, [remaining, onClose]);

  // Escape closes; focus starts on the close button.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Keep the screen awake while presenting (best effort, no-op where unsupported).
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
    };
    nav.wakeLock
      ?.request('screen')
      .then((l) => {
        lock = l;
      })
      .catch(() => undefined);
    return () => {
      void lock?.release().catch(() => undefined);
    };
  }, []);

  // Lock page scroll behind the overlay.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const cs = window.getComputedStyle(stage);
    const px = (v: string) => Number.parseFloat(v) || 0;
    const maxW = stage.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight);
    const maxH = stage.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom);
    if (maxW === 0 || maxH === 0) return;
    const scale = Math.min(maxW / image.width, maxH / image.height);
    const width = Math.max(1, Math.floor(image.width * scale));
    const height = Math.max(1, Math.floor(image.height * scale));
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderSafeCopy(ctx, {
      source: image.source,
      width,
      height,
      masks,
      watermark: buildPresentWatermark(details, now),
    });
  }, [image, masks, details, now]);

  useEffect(() => {
    if (!revealed) return;
    draw();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', draw);
      return () => window.removeEventListener('resize', draw);
    }
    const ro = new ResizeObserver(draw);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, [draw, revealed]);

  const recipient = details.recipient.trim() || '提出先未入力';

  return (
    <div className="present" role="dialog" aria-modal="true" aria-labelledby="present-title">
      <div className="present__bar">
        <div className="present__meta">
          <p className="present__eyebrow">提示専用 ・ ファイルは生成されていません</p>
          <h2 id="present-title" className="present__title">
            {recipient}
          </h2>
        </div>
        <p className="present__clock" aria-live="off">
          {formatTime(now)}
        </p>
      </div>

      <div className="present__stage" ref={stageRef} onContextMenu={(e) => e.preventDefault()}>
        {revealed ? (
          <canvas
            ref={canvasRef}
            className="present__canvas"
            role="img"
            aria-label={`${recipient} に提示中の書類`}
            onClick={() => setRevealed(false)}
          />
        ) : (
          <button type="button" className="present__cover" aria-label="タップして表示" onClick={() => setRevealed(true)}>
            <span className="present__cover-label">タップして表示</span>
            <span className="present__cover-help">相手に画面を見せる準備ができてから表示してください。</span>
          </button>
        )}
      </div>

      <div className="present__foot">
        <p className="present__note">
          スクリーンショットには提出先名と秒単位の時刻が写り込みます。{revealed ? '画面をタップすると隠せます。' : ''}
          あと {formatRemaining(remaining)} で自動的に閉じます。
        </p>
        <button ref={closeRef} type="button" className="btn btn--ghost present__close" onClick={onClose}>
          提示を終了
        </button>
      </div>
    </div>
  );
}
