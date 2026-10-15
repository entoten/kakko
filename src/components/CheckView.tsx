import { useId, useRef, useState } from 'react';
import type { Payload } from '../verify/payload';
import { deleteByOf } from '../verify/payload';
import { compare, purposeLabel, type VerifyResult } from '../verify/verify';
import { readPayloadFromFile } from '../verify/decode';
import { retentionLabel } from '../lib/retention';

interface CheckViewProps {
  /** Payload carried by the link that opened this view (a scanned QR code). */
  scanned: Payload | null;
  onBack: () => void;
  onOpenBusiness: () => void;
}

function PayloadTable({ payload }: { payload: Payload }) {
  const deleteBy = deleteByOf(payload);
  return (
    <dl className="request__decl checkview__table">
      <div>
        <dt>宛先</dt>
        <dd>{payload.to || '（なし）'}</dd>
      </div>
      <div>
        <dt>用途</dt>
        <dd>{purposeLabel(payload)}</dd>
      </div>
      <div>
        <dt>提出日</dt>
        <dd>{payload.date}</dd>
      </div>
      <div>
        <dt>削除期限</dt>
        <dd>
          {payload.retain === undefined
            ? '指定なし'
            : deleteBy
              ? `${deleteBy}（${retentionLabel(payload.retain)}）`
              : retentionLabel(payload.retain)}
        </dd>
      </div>
      <div>
        <dt>照合番号</dt>
        <dd>{payload.nonce}</dd>
      </div>
    </dl>
  );
}

/**
 * Recipient-side check page: verify a received copy in this browser, or
 * show what a scanned QR code says. Nothing is uploaded.
 */
export function CheckView({ scanned, onBack, onOpenBusiness }: CheckViewProps) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [expectTo, setExpectTo] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    setResult(null);
    setError(null);
    setFileName(file?.name ?? null);
    if (!file) return;
    setBusy(true);
    try {
      const payload = await readPayloadFromFile(file);
      setResult(compare(payload, { to: expectTo.trim() || undefined }));
    } catch {
      setError('画像を読み取れませんでした。PNG か JPEG を選んでください。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="builder checkview" aria-labelledby="check-title">
      <p className="hero__eyebrow">受け取る側の確認</p>
      <h1 id="check-title" className="builder__title">
        誰宛てで、
        <br />
        いつまでか。
      </h1>
      <p className="builder__lead">
        KAKKO で作られたコピーには、宛先・用途・提出日・削除期限・照合番号を載せた QR
        コードが付いています。ここで画像を選ぶと、この端末のブラウザ内で読み取って表示します。画像は KAKKO
        に送られません。
      </p>

      {scanned ? (
        <div className="checkview__scanned">
          <p className="field__label">この QR コードの内容</p>
          <PayloadTable payload={scanned} />
          <p className="field__help">
            QR コードは画像に刻まれた透かしと同じ内容を機械可読にしたものです。照合番号は提出者の確認レシートにも記載されています。
          </p>
        </div>
      ) : null}

      <div className="form">
        <div className="field">
          <label className="field__label" htmlFor={`${id}-to`}>
            あなたの事業者名（任意）
          </label>
          <input
            id={`${id}-to`}
            className="input"
            type="text"
            maxLength={60}
            placeholder="例: Sakura Guest House"
            value={expectTo}
            onChange={(e) => setExpectTo(e.target.value)}
          />
          <span className="field__help">入力すると、コピーの宛先と一致するかも確認します。</span>
        </div>

        <div className="field">
          <p className="field__label" id={`${id}-file-label`}>
            受け取った画像
          </p>
          <input
            ref={fileRef}
            className="visually-hidden"
            type="file"
            accept="image/png,image/jpeg"
            aria-labelledby={`${id}-file-label`}
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <div className="toolbar">
            <button type="button" className="btn btn--primary" onClick={() => fileRef.current?.click()}>
              画像を選んで確認
            </button>
            {fileName ? <span className="field__help">{fileName}</span> : null}
          </div>
        </div>
      </div>

      <p className="status" role="status" aria-live="polite">
        {busy ? '読み取り中…' : result ? result.summary : ''}
      </p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {result?.payload ? <PayloadTable payload={result.payload} /> : null}

      <div className="builder__rules">
        <p className="field__label">自分のフォームに組み込むには</p>
        <ul>
          <li>
            依頼リンク作成の画面で、1 行の埋め込みコードを生成できます。既存のアップロードフォームに貼るだけで、この確認が自動で行われ、削除期限が hidden
            input としてサーバーに届きます。
          </li>
          <li>確認は閲覧者のブラウザ内で完結します。KAKKO のサーバーは画像を受け取りません。</li>
          <li>QR コードは改ざん防止ではありません。透かしと同じく「誰に・いつまで」の約束を機械可読にしたものです。</li>
        </ul>
        <button type="button" className="btn btn--ghost" onClick={onOpenBusiness}>
          埋め込みコードを作る
        </button>
      </div>

      <button type="button" className="btn btn--ghost" onClick={onBack}>
        ← KAKKO に戻る
      </button>
    </section>
  );
}
