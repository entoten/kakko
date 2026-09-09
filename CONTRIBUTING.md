# Contributing to KAKKO

貢献ありがとうございます。KAKKO は小さなプロジェクトですが、扱う対象が本人確認書類であるため、いくつか **絶対に守ってほしいルール** があります。

## 破ってはいけない原則

1. **画像をブラウザの外へ出さない。** `fetch` / `XMLHttpRequest` / `WebSocket` / `sendBeacon` / Service Worker を追加する PR は受け付けません。ESLint とテストが失敗するようになっています。
2. **画像を永続化しない。** `localStorage` / `sessionStorage` / `indexedDB` / Cookie を使わないでください。
3. **サーバー側コードを追加しない。** `wrangler.jsonc` に `main` を追加したり、R2 / D1 / KV / AI などのバインディングを足す変更は、この原則を壊します。
4. **外部リソースを読み込まない。** 外部フォント、CDN、アナリティクス、iframe はすべて CSP でブロックされます。CSP を緩める変更は原則として受け付けません。
5. **実在する身分証画像をコミットしない。** テスト・スクリーンショット・Issue の添付を含め、実在の人物や実在の書類デザインを忠実に再現したものは禁止です。`public/sample/` の架空サンプル（大きく SAMPLE と書かれたもの）だけを使ってください。
6. **秘密情報をコミットしない。** API キー、Cloudflare Token、`.dev.vars`、`.env` は `.gitignore` 済みです。必要な環境変数は現状ありません。
7. **法的判断を自動化しない。** 「この用途ならこの項目を隠してよい」と断定する UI やロジックは、MVP では追加しないでください。将来のルールエンジンは `src/rules/purposeRules.ts` の `maskHints` を拡張する形で、あくまで「提案」として実装します。

## 開発環境

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run test       # Vitest
npm run lint       # ESLint
npm run typecheck  # tsc
npm run build      # dist/ を生成
npm run check      # 上の 4 つをまとめて実行
```

Node.js 22.12 以上が必要です。

## 変更の進め方

- 小さな PR を歓迎します。1 PR = 1 テーマにしてください。
- 新しい振る舞いにはテストを追加してください。特に `src/lib/` のロジックは DOM なしでテストできるように保ってください。
- 依存パッケージの追加は最小限に。実行時依存の追加は理由を PR に明記してください。
- UI の変更はスマートフォン（特に iPhone Safari）での表示・タッチ操作を確認してください。
- アクセシビリティ（ラベル、キーボード操作、コントラスト、フォーカス表示）を損なわないでください。Canvas だけに情報を依存させないでください。

## コーディング規約

- TypeScript strict モード。`any` は避けてください。
- `eval` / `new Function` / `dangerouslySetInnerHTML` は禁止です（lint エラーになります）。
- ユーザー入力（提出先、用途）は必ず `sanitizeText` を通してから描画・ファイル名に使います。

## 行動規範

敬意を持って接してください。KAKKO の利用者は、身分証の提出を求められて不安を感じている人かもしれません。その視点を忘れずに議論しましょう。
