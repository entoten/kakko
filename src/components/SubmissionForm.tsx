import { useId } from 'react';
import type { PurposeId, SubmissionDetails } from '../lib/types';
import { getPurposeRule, purposeRules } from '../rules/purposeRules';

interface SubmissionFormProps {
  details: SubmissionDetails;
  onChange: (next: SubmissionDetails) => void;
  warningAcknowledged: boolean;
  onAcknowledge: (value: boolean) => void;
}

export function SubmissionForm({ details, onChange, warningAcknowledged, onAcknowledge }: SubmissionFormProps) {
  const id = useId();
  const rule = getPurposeRule(details.purpose);

  const setPurpose = (purpose: PurposeId) => onChange({ ...details, purpose });

  return (
    <div className="form">
      <fieldset className="fieldset">
        <legend className="field__label">提出目的</legend>
        <div className="chips" role="radiogroup" aria-label="提出目的">
          {purposeRules.map((p) => {
            const checked = p.id === details.purpose;
            return (
              <label key={p.id} className={`chip${checked ? ' chip--on' : ''}`}>
                <input
                  type="radio"
                  name={`${id}-purpose`}
                  value={p.id}
                  checked={checked}
                  onChange={() => setPurpose(p.id)}
                  className="visually-hidden"
                />
                <span>{p.label}</span>
              </label>
            );
          })}
        </div>
        <p className="field__help">{rule.description}</p>
      </fieldset>

      {details.purpose === 'other' ? (
        <div className="field">
          <label className="field__label" htmlFor={`${id}-custom`}>
            用途（自由入力）
          </label>
          <input
            id={`${id}-custom`}
            className="input"
            type="text"
            maxLength={40}
            placeholder="例: 会員登録"
            value={details.customPurpose}
            onChange={(e) => onChange({ ...details, customPurpose: e.target.value })}
          />
        </div>
      ) : null}

      {rule.warning ? (
        <div className="warning" role="region" aria-labelledby={`${id}-warning-title`}>
          <h3 id={`${id}-warning-title`} className="warning__title">
            {rule.warning.title}
          </h3>
          <p className="warning__body">{rule.warning.body}</p>
          {rule.warning.redFlags ? (
            <ul className="warning__list">
              {rule.warning.redFlags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          ) : null}
          <label className="check">
            <input
              type="checkbox"
              checked={warningAcknowledged}
              onChange={(e) => onAcknowledge(e.target.checked)}
            />
            <span>上記に当てはまらないことを確認しました</span>
          </label>
        </div>
      ) : null}

      <div className="field">
        <label className="field__label" htmlFor={`${id}-recipient`}>
          提出先
        </label>
        <input
          id={`${id}-recipient`}
          className="input"
          type="text"
          maxLength={60}
          autoComplete="organization"
          placeholder="例: Sakura Guest House"
          value={details.recipient}
          onChange={(e) => onChange({ ...details, recipient: e.target.value })}
          aria-describedby={`${id}-recipient-help`}
        />
        <span id={`${id}-recipient-help`} className="field__help">
          会社名・施設名など。画像全体に刻まれます。
        </span>
      </div>

      <div className="field">
        <label className="field__label" htmlFor={`${id}-date`}>
          日付
        </label>
        <input
          id={`${id}-date`}
          className="input"
          type="date"
          value={details.date}
          onChange={(e) => onChange({ ...details, date: e.target.value })}
        />
      </div>
    </div>
  );
}
