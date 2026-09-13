import { useEffect, useId, useRef, useState } from 'react';
import type { ExportFormat, LoadedImage, Mask } from '../lib/types';
import { canShareFile, exportSafeCopy, shareResult, triggerDownload, type ExportResult } from '../lib/export';

interface ExportPanelProps {
  image: LoadedImage;
  masks: readonly Mask[];
  watermark: string;
  /** When set, export is disabled and this message explains why. */
  blocked: string | null;
  onReset: () => void;
}

interface Generated extends ExportResult {
  previewUrl: string;
  image: LoadedImage;
  masks: readonly Mask[];
  watermark: string;
  format: ExportFormat;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ExportPanel({ image, masks, watermark, blocked, onReset }: ExportPanelProps) {
  const id = useId();
  const [format, setFormat] = useState<ExportFormat>('image/png');
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef<Generated | null>(null);

  // A generated copy is only shown while the inputs it was made from are
  // still current; any edit simply hides it until the user regenerates.
  const result =
    generated &&
    generated.image === image &&
    generated.masks === masks &&
    generated.watermark === watermark &&
    generated.format === format
      ? generated
      : null;

  // Revoke the preview URL when the component goes away.
  useEffect(() => {
    return () => {
      if (latest.current) URL.revokeObjectURL(latest.current.previewUrl);
    };
  }, []);

  const generate = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const out = await exportSafeCopy({ image, masks, watermark, format });
      if (latest.current) URL.revokeObjectURL(latest.current.previewUrl);
      const next: Generated = {
        ...out,
        previewUrl: URL.createObjectURL(out.blob),
        image,
        masks,
        watermark,
        format,
      };
      latest.current = next;
      setGenerated(next);
      setMessage('安全なコピーができました。下のボタンから端末に保存してください。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '書き出しに失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!result) return;
    triggerDownload(result.blob, result.fileName);
    setMessage('保存を開始しました。ダウンロードまたは「ファイル」アプリを確認してください。');
  };

  const share = async () => {
    if (!result) return;
    try {
      const done = await shareResult(result);
      setMessage(done ? '共有シートから保存しました。' : '共有をキャンセルしました。');
    } catch {
      triggerDownload(result.blob, result.fileName);
      setMessage('共有できなかったため、ダウンロードに切り替えました。');
    }
  };

  const disabled = busy || Boolean(blocked);

  return (
    <div className="export">
      <fieldset className="fieldset">
        <legend className="field__label">形式</legend>
        <div className="chips" role="radiogroup" aria-label="書き出し形式">
          {(
            [
              ['image/png', 'PNG（劣化なし）'],
              ['image/jpeg', 'JPEG（軽量）'],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className={`chip${format === value ? ' chip--on' : ''}`}>
              <input
                type="radio"
                name={`${id}-format`}
                value={value}
                checked={format === value}
                onChange={() => setFormat(value)}
                className="visually-hidden"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <dl className="summary">
        <div>
          <dt>黒塗り</dt>
          <dd>{masks.length} 件</dd>
        </div>
        <div>
          <dt>ウォーターマーク</dt>
          <dd>{watermark || '（未設定）'}</dd>
        </div>
      </dl>

      {masks.length === 0 ? (
        <p className="note">黒塗りがありません。見せる必要のない項目がないか、もう一度確認してください。</p>
      ) : null}

      {blocked ? (
        <p className="note note--warn" role="status">
          {blocked}
        </p>
      ) : null}

      <button type="button" className="btn btn--primary btn--xl btn--block" onClick={generate} disabled={disabled}>
        {busy ? '生成中…' : '安全なコピーを作成'}
      </button>

      <p className="status" role="status" aria-live="polite">
        {result ? message : null}
      </p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="result">
          <img className="result__img" src={result.previewUrl} alt="生成された安全なコピーのプレビュー" />
          <p className="result__meta">
            {result.fileName} ・ {result.width}×{result.height} ・ {formatBytes(result.blob.size)}
          </p>
          <div className="result__actions">
            <button type="button" className="btn btn--primary btn--block" onClick={download}>
              端末に保存
            </button>
            {canShareFile(result) ? (
              <button type="button" className="btn btn--secondary btn--block" onClick={share}>
                共有…（写真に保存など）
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="note note--muted">
        加工しても提出先の信頼性は変わりません。提出を求める相手や理由に不安がある場合は、提出しないでください。
      </p>

      <button type="button" className="btn btn--ghost" onClick={onReset}>
        別の画像を選ぶ（この画像を破棄）
      </button>
    </div>
  );
}
