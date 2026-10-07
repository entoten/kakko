import { useId, useMemo, useState } from 'react';
import {
  DELETION_REQUEST_SUBJECT,
  buildDeletionRequest,
  buildMailto,
  documentLabels,
  emptyDeletionRequest,
  reasonLabels,
  type DeletionReason,
  type DeletionRequestInput,
  type DocumentKind,
} from '../lib/deletionRequest';
import { triggerDownload } from '../lib/export';
import { todayIso } from '../lib/watermark';

interface DeletionRequestProps {
  onBack: () => void;
}

const DOCUMENT_ORDER: DocumentKind[] = ['license', 'mynumber', 'passport', 'insurance', 'residence', 'other'];
const REASON_ORDER: DeletionReason[] = ['withdrawn', 'leak', 'purposeDone'];

/**
 * Deletion-request letter generator. Everything stays in component state;
 * the letter is only copied, downloaded, printed or handed to the user's
 * own mail client via a mailto: link.
 */
export function DeletionRequest({ onBack }: DeletionRequestProps) {
  const id = useId();
  const [input, setInput] = useState<DeletionRequestInput>(() => emptyDeletionRequest(todayIso()));
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const letter = useMemo(() => buildDeletionRequest(input), [input]);

  const set = <K extends keyof DeletionRequestInput>(key: K, value: DeletionRequestInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  const toggle = <T extends string>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(letter);
      setStatus('請求文をコピーしました。');
    } catch {
      setStatus('コピーできませんでした。下の文面を選択してコピーしてください。');
    }
  };

  const download = () => {
    triggerDownload(new Blob([letter], { type: 'text/plain;charset=utf-8' }), 'kakko-deletion-request.txt');
    setStatus('テキストファイルを保存しました。');
  };

  const print = () => {
    window.print();
  };

  const mailto = email.trim() ? buildMailto(email, DELETION_REQUEST_SUBJECT, letter) : null;

  return (
    <section className="deletion" aria-labelledby="deletion-title">
      <div className="deletion__intro">
        <p className="hero__eyebrow">流出が心配な方へ</p>
        <h1 id="deletion-title" className="builder__title">
          預けた画像を、
          <br />
          消してもらう。
        </h1>
        <p className="builder__lead">
          退会した事業者が、あなたの免許証画像を今も持っているかもしれません。個人情報保護法には、不要になったデータや漏えいしたデータの消去と利用停止を求める権利があります（第35条第5項）。この画面で請求文を作れます。入力内容はこの端末の外に出ません。
        </p>
      </div>

      <div className="deletion__grid">
        <form className="form deletion__form" onSubmit={(e) => e.preventDefault()}>
          <div className="field">
            <label className="field__label" htmlFor={`${id}-company`}>
              宛先の事業者名
            </label>
            <input
              id={`${id}-company`}
              className="input"
              type="text"
              maxLength={60}
              placeholder="例: ○○株式会社"
              value={input.company}
              onChange={(e) => set('company', e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor={`${id}-service`}>
              サービス名（任意）
            </label>
            <input
              id={`${id}-service`}
              className="input"
              type="text"
              maxLength={60}
              placeholder="例: カーシェアサービス"
              value={input.service}
              onChange={(e) => set('service', e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor={`${id}-member`}>
              登録情報（任意）
            </label>
            <input
              id={`${id}-member`}
              className="input"
              type="text"
              maxLength={80}
              placeholder="例: 会員番号、登録メールアドレス"
              value={input.memberId}
              onChange={(e) => set('memberId', e.target.value)}
            />
            <span className="field__help">事業者があなたを特定するための情報。免許証番号は書かないでください。</span>
          </div>

          <div className="field">
            <label className="field__label" htmlFor={`${id}-ended`}>
              退会・利用終了の時期（任意）
            </label>
            <input
              id={`${id}-ended`}
              className="input"
              type="text"
              maxLength={40}
              placeholder="例: 2024年3月ごろ"
              value={input.endedAt}
              onChange={(e) => set('endedAt', e.target.value)}
            />
          </div>

          <fieldset className="fieldset">
            <legend className="field__label">消去を求める書類</legend>
            <ul className="builder__fields">
              {DOCUMENT_ORDER.map((d) => (
                <li key={d}>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={input.documents.includes(d)}
                      onChange={() => set('documents', toggle(input.documents, d))}
                    />
                    <span>{documentLabels[d]}</span>
                  </label>
                </li>
              ))}
            </ul>
            {input.documents.includes('other') ? (
              <input
                className="input"
                type="text"
                maxLength={60}
                placeholder="その他の書類名"
                aria-label="その他の書類名"
                value={input.otherDocument}
                onChange={(e) => set('otherDocument', e.target.value)}
              />
            ) : null}
          </fieldset>

          <fieldset className="fieldset">
            <legend className="field__label">理由</legend>
            <ul className="builder__fields">
              {REASON_ORDER.map((r) => (
                <li key={r}>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={input.reasons.includes(r)}
                      onChange={() => set('reasons', toggle(input.reasons, r))}
                    />
                    <span>{reasonLabels[r]}</span>
                  </label>
                </li>
              ))}
            </ul>
            <span className="field__help">
              「漏えい等」は、事業者が流出を公表している場合にチェックしてください。
            </span>
          </fieldset>

          <div className="field">
            <label className="field__label" htmlFor={`${id}-name`}>
              あなたの氏名
            </label>
            <input
              id={`${id}-name`}
              className="input"
              type="text"
              maxLength={40}
              autoComplete="name"
              value={input.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor={`${id}-contact`}>
              回答先（任意）
            </label>
            <input
              id={`${id}-contact`}
              className="input"
              type="text"
              maxLength={120}
              placeholder="例: メールアドレス、または郵送先"
              value={input.contact}
              onChange={(e) => set('contact', e.target.value)}
            />
          </div>

          <div className="field field--inline">
            <label className="field__label" htmlFor={`${id}-days`}>
              回答期限（日）
            </label>
            <span className="field__unit-wrap">
              <input
                id={`${id}-days`}
                className="input input--num"
                type="number"
                inputMode="numeric"
                min={7}
                max={60}
                value={input.deadlineDays}
                onChange={(e) => set('deadlineDays', Number(e.target.value))}
              />
              <span className="field__unit" aria-hidden="true">
                日
              </span>
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
              value={input.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </div>
        </form>

        <div className="deletion__output">
          <p className="field__label">請求文</p>
          <pre className="letter" tabIndex={0} aria-label="生成された請求文">
            {letter}
          </pre>

          <div className="toolbar deletion__actions">
            <button type="button" className="btn btn--primary" onClick={copy}>
              コピー
            </button>
            <button type="button" className="btn btn--ghost" onClick={download}>
              テキストで保存
            </button>
            <button type="button" className="btn btn--ghost" onClick={print}>
              印刷（郵送用）
            </button>
          </div>

          <div className="field">
            <label className="field__label" htmlFor={`${id}-email`}>
              事業者の問い合わせ先メール（任意）
            </label>
            <input
              id={`${id}-email`}
              className="input"
              type="email"
              inputMode="email"
              placeholder="privacy@example.co.jp"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {mailto ? (
              <a className="btn btn--secondary" href={mailto}>
                メールアプリで開く
              </a>
            ) : (
              <span className="field__help">入力すると、本文入りでメールアプリを開けます。</span>
            )}
          </div>

          <p className="status" role="status" aria-live="polite">
            {status}
          </p>
        </div>
      </div>

      <div className="deletion__guide">
        <p className="field__label">送る前に</p>
        <ul>
          <li>
            事業者は「開示等の請求に応じる手続」を公表する義務があります（法第32条）。プライバシーポリシーに専用フォームや窓口が書かれていれば、そちらを優先してください。
          </li>
          <li>
            本人確認を求められても、<strong>免許証の画像を再び送らないでください</strong>
            。登録メールからの送信や会員情報の照合など、画像を伴わない方法を求める一文を請求文に入れてあります。
          </li>
          <li>郵送する場合は、簡易書留など到達日が分かる方法が確実です。</li>
          <li>
            期限内に回答がない、または理由なく拒否された場合は、個人情報保護委員会の相談窓口や、その事業者が加入する認定個人情報保護団体に相談できます。
          </li>
          <li>
            すでに流出が公表されている場合は、消去請求と別に、信用情報機関（CIC・JICC・全国銀行個人信用情報センター）の本人申告制度の利用も検討してください。
          </li>
        </ul>
        <p className="note note--muted">
          この文面は個人情報保護法の条文に基づくひな形で、法的助言ではありません。個別の事情については弁護士等にご相談ください。
        </p>
      </div>

      <div className="deletion__next">
        <p className="field__label">次に求められたとき</p>
        <p>
          消してもらうのは後始末です。次に「身分証の写真を送ってください」と言われたら、必要な部分だけを見せてください。
        </p>
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          ← KAKKO で安全なコピーを作る
        </button>
      </div>
    </section>
  );
}
