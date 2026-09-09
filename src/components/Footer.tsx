import { PRIVACY_STATEMENT, PRIVACY_TECHNICAL } from './PrivacyNotice';

export const REPOSITORY_URL = 'https://github.com/entoten/kakko';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <p className="footer__statement">{PRIVACY_STATEMENT}</p>
        <p className="footer__tech">{PRIVACY_TECHNICAL}</p>
        <p className="footer__disclaimer">
          KAKKO
          は法的助言を提供するものではありません。どの項目を隠してよいか、提出が必要かどうかは、提出先の案内や公的な情報を確認のうえご自身で判断してください。
        </p>
        <p className="footer__links">
          <a href={REPOSITORY_URL} rel="noopener noreferrer">
            ソースコード（GitHub）
          </a>
          <span aria-hidden="true"> ・ </span>
          <span>Apache-2.0</span>
        </p>
      </div>
    </footer>
  );
}
