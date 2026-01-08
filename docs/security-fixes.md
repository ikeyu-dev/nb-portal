# セキュリティ修正履歴
<span style="display:block;height:3px;background:#2a83a2;margin-top:-8px;margin-bottom:16px;"></span>

## 修正日: 2025-12-28
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

### 1. Next.jsの脆弱性修正

- **深刻度**: 高
- **対象**: `package.json`

**脆弱性**:
- GHSA-w37m-7fhw-fmv9: Server Actions Source Code Exposure
- GHSA-mwv6-3258-q52c: DoS with Server Components

**修正**: Next.js 16.0.7 → 16.1.1 にアップグレード

### 2. セキュリティヘッダーの追加

- **深刻度**: 高
- **対象**: `next.config.ts`

| ヘッダー | 値 | 目的 |
|----------|---|------|
| X-Frame-Options | DENY | クリックジャッキング対策 |
| X-Content-Type-Options | nosniff | MIMEスニッフィング対策 |
| Referrer-Policy | strict-origin-when-cross-origin | リファラー漏洩防止 |
| Strict-Transport-Security | max-age=31536000 | HTTPS強制 |
| Permissions-Policy | camera=(), microphone=() | 不要API無効化 |

### 3. proxy.tsの認証パス設定整理

- **深刻度**: 高
- **対象**: `proxy.ts`

**修正**:
- 公開パス（`publicPaths`）とAPIシークレット保護パスを分離
- `apiSecretProtectedPaths`を明示的に定義
- 認証フローを明確化

### 4. APIシークレット検証のタイミングセーフ化

- **深刻度**: 中
- **対象**: `app/api/push-send/route.ts`

**修正**: `crypto.timingSafeEqual`を使用したタイミングセーフな比較に変更

### 5. GAS APIプロキシの実装

- **深刻度**: 中
- **対象**: `app/api/gas/route.ts`（新規）

**修正**:
- GAS APIへのプロキシエンドポイント作成
- クライアント側呼び出しをプロキシ経由に変更
- 許可パスのホワイトリスト実装

### 6. 入力バリデーションの実装

- **深刻度**: 中
- **対象**: `src/shared/lib/validation.ts`（新規）

**修正**:
- zodパッケージを追加
- 欠席連絡・GAS APIのバリデーション追加

### 7. CSRF保護の実装

- **深刻度**: 中
- **対象**: `src/shared/lib/csrf.ts`（新規）

**修正**:
- Origin/Refererヘッダーによる同一オリジン検証
- Content-Type検証（application/jsonのみ許可）

### 8. サーバーサイドAPI呼び出しの分離

- **深刻度**: 低
- **対象**: `src/shared/api/server.ts`（新規）

**修正**: Server Components用API関数を作成、環境変数URLで直接GAS API呼び出し

## 今後の対応
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

### 中優先度

| 項目 | 対応方針 |
|------|----------|
| セッション期限が長すぎる（180日） | 30日程度に短縮 |

### 低優先度

| 項目 | 備考 |
|------|------|
| console.logの残存 | 本番ビルド時に削除設定を追加 |
| next-authがbeta版 | 安定版リリース待ち |

## 参考リンク
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

- [Next.js Security Advisories](https://github.com/vercel/next.js/security/advisories)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [Node.js crypto.timingSafeEqual](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b)
- [Zod Documentation](https://zod.dev/)
