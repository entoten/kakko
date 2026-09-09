import { useId, useMemo, useState } from 'react';
import type { PurposeId } from '../lib/types';
import { buildRequestLink } from '../lib/link';
import { documentFields, type FieldId } from '../rules/fields';
import { purposeRules } from '../rules/purposeRules';

interface LinkBuilderProps {
  origin: string;
  onBack: () => void;
}

const DEFAULT_KEEP: Record<PurposeId, FieldId[]> = {
  lodging: ['photo', 'name'],
  job: ['photo', 'name'],
  rental: ['photo', 'name', 'address'],
  resale: ['photo', 'name', 'address', 'birthdate'],
  other: ['photo', 'name'],
};

/**
 * Lets a recipient (a business) build a request link. Runs entirely in the
 * browser: nothing is registered anywhere, and the link is just text.
 */
export function LinkBuilder({ origin, onBack }: LinkBuilderProps) {
  const id = useId();
  const [purpose, setPurpose] = useState<PurposeId>('lodging');
  const [customPurpose, setCustomPurpose] = useState('');
  const [recipient, setRecipient] = useState('');
  const [keep, setKeep] = useState<FieldId[]>(DEFAULT_KEEP.lodging);
  const [copied, setCopied] = useState<string | null>(null);

  const link = useMemo(
    () => buildRequestLink(origin, { purpose, customPurpose, recipient, keep }),
    [origin, purpose, customPurpose, recipient, keep],
  );
  const snippet = `<a href="${link}">KAKKO で安全なコピーを作る</a>`;

  const changePurpose = (next: PurposeId) => {
    setPurpose(next);
    setKeep(DEFAULT_KEEP[next]);
  };

  const toggle = (field: FieldId) => {
    setKeep((prev) => (prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]));
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
    } catch {
      setCopied(null);
    }
  };

  return (
    <section className="builder" aria-labelledby="builder-title">
      <p className="hero__eyebrow">事業者の方へ</p>
      <h1 id="builder-title" className="builder__title">
        必要な項目だけ、
        <br />
        受け取る。
      </h1>
      <p className="builder__lead">
        提出を求める相手に「このリンクから作ってください」と渡すだけで、KAKKO
        が用途・提出先・残してほしい項目を最初から表示します。登録も API
        もありません。リンクはただの文字列で、画像はあなたのお客様の端末からあなたへ直接届きます。KAKKO
        を経由することはありません。
      </p>

      <div className="form">
        <fieldset className="fieldset">
          <legend className="field__label">用途</legend>
          <div className="chips" role="radiogroup" aria-label="用途">
            {purposeRules.map((p) => (
              <label key={p.id} className={`chip${purpose === p.id ? ' chip--on' : ''}`}>
                <input
                  type="radio"
                  name={`${id}-purpose`}
                  value={p.id}
                  checked={purpose === p.id}
                  onChange={() => changePurpose(p.id)}
                  className="visually-hidden"
                />
                <span>{p.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {purpose === 'other' ? (
          <div className="field">
            <label className="field__label" htmlFor={`${id}-custom`}>
              用途（自由入力）
            </label>
            <input
              id={`${id}-custom`}
              className="input"
              type="text"
              maxLength={40}
              value={customPurpose}
              onChange={(e) => setCustomPurpose(e.target.value)}
            />
          </div>
        ) : null}

        <div className="field">
          <label className="field__label" htmlFor={`${id}-to`}>
            あなたの事業者名・施設名
          </label>
          <input
            id={`${id}-to`}
            className="input"
            type="text"
            maxLength={60}
            placeholder="例: Sakura Guest House"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
          <span className="field__help">画像全体のウォーターマークに刻まれます。</span>
        </div>

        <fieldset className="fieldset">
          <legend className="field__label">見えている必要がある項目</legend>
          <p className="field__help">
            チェックしなかった項目は「隠して構いません」と表示されます。法令で確認が義務づけられている項目がある場合は、必ずチェックしてください。
          </p>
          <ul className="builder__fields">
            {documentFields.map((f) => (
              <li key={f.id}>
                <label className="check">
                  <input type="checkbox" checked={keep.includes(f.id)} onChange={() => toggle(f.id)} />
                  <span>
                    {f.label}
                    <span className="builder__note">{f.note}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      </div>

      <div className="builder__output">
        <p className="field__label">依頼リンク</p>
        <pre className="code" tabIndex={0}>
          {link}
        </pre>
        <div className="toolbar">
          <button type="button" className="btn btn--primary" onClick={() => copy(link, 'link')}>
            リンクをコピー
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => copy(snippet, 'html')}>
            HTML をコピー
          </button>
          <a className="btn btn--ghost" href={link} target="_blank" rel="noopener">
            開いて確認
          </a>
        </div>
        <p className="status" role="status" aria-live="polite">
          {copied === 'link' ? 'リンクをコピーしました。' : copied === 'html' ? 'HTML をコピーしました。' : ''}
        </p>
        <p className="field__label">HTML に貼る場合</p>
        <pre className="code" tabIndex={0}>
          {snippet}
        </pre>
      </div>

      <div className="builder__rules">
        <p className="field__label">受け取る側としてお願いしたいこと</p>
        <ul>
          <li>必要な項目だけをチェックしてください。多く求めるほど、提出をためらう人が増えます。</li>
          <li>受け取ったコピーは目的が終わったら削除してください。ウォーターマークには貴社名が入っています。</li>
          <li>重要な取引では、コピーだけに頼らず対面かビデオ通話で原本を確認してください。</li>
          <li>KAKKO は法的助言を提供しません。確認義務のある項目は所管法令で確認してください。</li>
        </ul>
      </div>

      <button type="button" className="btn btn--ghost" onClick={onBack}>
        ← KAKKO に戻る
      </button>
    </section>
  );
}
