interface PrivacyNoticeProps {
  variant: 'full' | 'compact';
}

export const PRIVACY_STATEMENT = '画像はこの端末内だけで処理されます。KAKKOのサーバーには送信されません。';
export const PRIVACY_TECHNICAL =
  'KAKKOはブラウザのCanvas APIを利用して画像を加工します。画像アップロード用APIは存在しません。';

export function PrivacyNotice({ variant }: PrivacyNoticeProps) {
  if (variant === 'compact') {
    return (
      <p className="privacy privacy--compact">
        <span className="privacy__icon" aria-hidden="true">
          ●
        </span>
        {PRIVACY_STATEMENT}
      </p>
    );
  }

  return (
    <section className="privacy privacy--full" aria-labelledby="privacy-title">
      <h2 id="privacy-title" className="privacy__title">
        {PRIVACY_STATEMENT}
      </h2>
      <p className="privacy__body">{PRIVACY_TECHNICAL}</p>
      <details className="privacy__details">
        <summary>もう少し詳しく</summary>
        <ul>
          <li>選んだ画像はブラウザのメモリ上でだけ展開され、Canvas に描画されます。</li>
          <li>
            配信されるのは静的な HTML / CSS / JavaScript だけで、画像を受け取るサーバー側の処理は存在しません。
          </li>
          <li>
            ページの通信ポリシー（Content Security Policy）で、外部への通信自体をブラウザに禁止させています。
          </li>
          <li>LocalStorage や IndexedDB などへの保存も行いません。ページを閉じれば画像は消えます。</li>
          <li>
            書き出す画像は新しい Canvas から生成するため、元の写真の位置情報（GPS）や撮影情報（EXIF）は含まれません。
          </li>
          <li>アクセス解析や外部トラッカーは使用していません。</li>
        </ul>
      </details>
    </section>
  );
}
