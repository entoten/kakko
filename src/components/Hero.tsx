import { useId, useRef } from 'react';

interface HeroProps {
  onFile: (file: File) => void;
  onSample: () => void;
  onOpenDeletion: () => void;
  error: string | null;
}

export function Hero({ onFile, onSample, onOpenDeletion, error }: HeroProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="hero" aria-labelledby="hero-title">
      <p className="hero__eyebrow">本人確認書類の安全な提出用コピー</p>
      <h1 id="hero-title" className="hero__title">
        必要な情報だけ、
        <br />
        見せる。
      </h1>
      <p className="hero__sub">身分証はあなたの端末内だけで処理されます。</p>

      <div className="hero__actions">
        <input
          ref={inputRef}
          id={inputId}
          className="visually-hidden"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (file) onFile(file);
            // Allow picking the same file again.
            e.currentTarget.value = '';
          }}
        />
        <button type="button" className="btn btn--primary btn--xl" onClick={() => inputRef.current?.click()}>
          画像を選択
        </button>
        <button type="button" className="btn btn--ghost btn--xl" onClick={onSample}>
          架空のサンプルで試す
        </button>
      </div>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <p className="hero__aside">
        すでに預けてしまった画像が心配な方は、
        <button type="button" className="link-button" onClick={onOpenDeletion}>
          事業者への削除請求文を作る
        </button>
        こともできます。
      </p>

      <ol className="hero__steps" aria-label="使い方">
        <li>
          <span className="hero__step-n" aria-hidden="true">01</span>
          <span>画像を選ぶ</span>
        </li>
        <li>
          <span className="hero__step-n" aria-hidden="true">02</span>
          <span>不要な部分を黒塗り</span>
        </li>
        <li>
          <span className="hero__step-n" aria-hidden="true">03</span>
          <span>提出先・用途・日付を刻む</span>
        </li>
        <li>
          <span className="hero__step-n" aria-hidden="true">04</span>
          <span>端末に保存して提出</span>
        </li>
      </ol>
    </section>
  );
}
