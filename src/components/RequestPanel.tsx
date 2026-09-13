import type { RequestLink } from '../lib/link';
import { documentFields, getField } from '../rules/fields';
import { getPurposeRule } from '../rules/purposeRules';

interface RequestPanelProps {
  link: RequestLink;
  onDismiss: () => void;
}

/**
 * Shows what a recipient asked for via a request link. It is deliberately
 * phrased as "their request", not as an instruction: the user still
 * decides what to mask.
 */
export function RequestPanel({ link, onDismiss }: RequestPanelProps) {
  const purposeLabel = link.purpose ? getPurposeRule(link.purpose).label : null;
  const keep = link.keep.map(getField);
  const others = documentFields.filter((f) => !link.keep.includes(f.id));

  return (
    <section className="request" aria-labelledby="request-title">
      <div className="request__head">
        <p className="request__eyebrow">提出先からの依頼リンクで開いています</p>
        <h2 id="request-title" className="request__title">
          {link.recipient ? link.recipient : '提出先'}
          {purposeLabel ? <span className="request__purpose">{purposeLabel}</span> : null}
        </h2>
      </div>

      {keep.length > 0 ? (
        <div className="request__group">
          <p className="request__label">相手が必要としている項目</p>
          <ul className="request__chips" aria-label="残す項目">
            {keep.map((f) => (
              <li key={f.id} className="request__chip request__chip--keep">
                {f.label}
              </li>
            ))}
          </ul>
          {others.length > 0 ? (
            <>
              <p className="request__label">それ以外は隠して構いません</p>
              <ul className="request__chips" aria-label="隠してよい項目">
                {others.map((f) => (
                  <li key={f.id} className="request__chip">
                    {f.label}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : (
        <p className="request__body">残す項目の指定はありません。必要と思う部分だけ残してください。</p>
      )}

      <p className="request__note">
        これは相手の希望であって、何を隠すかはあなたが決めます。求められている項目が多すぎると感じたら、提出前に相手へ確認してください。
      </p>

      <button type="button" className="btn btn--ghost btn--small" onClick={onDismiss}>
        依頼内容を使わない
      </button>
    </section>
  );
}
