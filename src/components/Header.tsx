export function Header() {
  return (
    <header className="header">
      <a className="skip-link" href="#main">
        本文へ移動
      </a>
      <div className="header__inner">
        <a href="/" className="wordmark" aria-label="KAKKO ホーム">
          <span className="wordmark__bracket" aria-hidden="true">
            「
          </span>
          <span className="wordmark__text">KAKKO</span>
          <span className="wordmark__bracket" aria-hidden="true">
            」
          </span>
        </a>
        <p className="header__badge">
          <span className="header__dot" aria-hidden="true" />
          端末内で処理・送信なし
        </p>
      </div>
    </header>
  );
}
