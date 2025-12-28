# セキュリティ修正履歴

本ドキュメントは、NB-Portalに対して実施したセキュリティ修正の内容をまとめたものである。

## 修正日: 2025-12-28

### 1. Next.jsの脆弱性修正

**深刻度**: 高

**対象ファイル**: `package.json`

**脆弱性**:
- GHSA-w37m-7fhw-fmv9: Server Actions Source Code Exposure
- GHSA-mwv6-3258-q52c: Denial of Service with Server Components

**修正内容**:
- Next.jsを16.0.7から16.1.1にアップグレード
- eslint-config-nextも16.1.1にアップグレード

**検証方法**:
```bash
npm audit
```

---

### 2. セキュリティヘッダーの追加

**深刻度**: 高

**対象ファイル**: `next.config.ts`

**問題点**:
セキュリティヘッダーが未設定で、以下の攻撃に対して脆弱だった:
- クリックジャッキング
- MIMEタイプスニッフィング
- 中間者攻撃

**修正内容**:
以下のセキュリティヘッダーを追加:

| ヘッダー | 値 | 目的 |
|---------|-----|------|
| X-DNS-Prefetch-Control | on | DNSプリフェッチを有効化 |
| X-Frame-Options | DENY | クリックジャッキング対策 |
| X-Content-Type-Options | nosniff | MIMEタイプスニッフィング対策 |
| Referrer-Policy | strict-origin-when-cross-origin | リファラー情報の漏洩防止 |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | 不要なAPIを無効化 |
| Strict-Transport-Security | max-age=31536000; includeSubDomains | HTTPS強制（1年間） |

**検証方法**:
ブラウザの開発者ツールでレスポンスヘッダーを確認。

---

### 3. proxy.tsの認証パス設定整理

**深刻度**: 高

**対象ファイル**: `proxy.ts`

**問題点**:
`/api/push-send`が`publicPaths`に含まれており、認証不要のパスとして扱われていた。
実際にはAPIシークレットで保護されているが、設定が不明確だった。

**修正内容**:
- 公開パス（`publicPaths`）からAPIシークレット保護パスを分離
- `apiSecretProtectedPaths`を明示的に定義
- セッション認証とAPIシークレット認証の役割を明確化

**修正後の認証フロー**:
```
リクエスト
    ↓
publicPaths? → セッション認証スキップ
    ↓
apiSecretProtectedPaths? → セッション認証スキップ（API側でシークレット認証）
    ↓
その他 → セッション認証必須
```

---

### 4. APIシークレット検証のタイミングセーフ化

**深刻度**: 中

**対象ファイル**: `app/api/push-send/route.ts`

**問題点**:
単純な文字列比較（`===`）を使用しており、タイミング攻撃に脆弱だった。

**修正内容**:
- `crypto.timingSafeEqual`を使用したタイミングセーフな比較に変更
- 文字列長が異なる場合でもダミー比較を実行してタイミング情報の漏洩を防止

**修正前**:
```typescript
if (providedSecret !== PUSH_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**修正後**:
```typescript
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
        crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
        return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

if (!timingSafeEqual(providedSecret, PUSH_API_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

---

## 今後の対応が必要な項目

### 中優先度

| 項目 | 説明 | 対応方針 |
|------|------|---------|
| クライアント側からのGAS API直接呼び出し | `NEXT_PUBLIC_GAS_API_URL`が公開されている | API Routes経由に変更 |
| レート制限の不足 | DoS攻撃のリスク | upstash/redisで実装 |
| 入力バリデーションの不足 | 不正なデータがGAS APIに送信される可能性 | zodでスキーマ検証 |
| セッション期限が長すぎる | 180日は長すぎる | 30日程度に短縮 |
| CSRF対策の不足 | カスタムAPIルートでCSRF保護がない | middleware.tsで実装 |

### 低優先度

| 項目 | 説明 |
|------|------|
| console.logの残存 | 本番ビルド時に削除する設定を追加 |
| next-authがbeta版 | 安定版リリース待ち |

---

## 参考リンク

- [Next.js Security Advisories](https://github.com/vercel/next.js/security/advisories)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [Node.js crypto.timingSafeEqual](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b)
