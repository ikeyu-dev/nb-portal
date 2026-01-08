# 認証
<span style="display:block;height:3px;background:#2a83a2;margin-top:-8px;margin-bottom:16px;"></span>

## 概要
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

| 項目 | 内容 |
|------|------|
| プロバイダ | Microsoft Entra ID（Azure AD） |
| ライブラリ | NextAuth.js v5（Auth.js） |
| セッション | JWT（署名付きトークン） |
| 有効期限 | 180日 |

## 認証フロー
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

```
ユーザー → /login → Microsoft Entra ID
                          ↓
     /home ← signIn Callback ← OAuth Callback（トークン取得）
```

### 1. ログイン開始

「Microsoftでログイン」ボタンクリック

### 2. Microsoft Entra ID認証

OAuth 2.0 + OpenID Connectで認証

### 3. signIn Callback

1. メールから学籍番号を抽出
2. GAS APIで部員確認（`verify-member`）
3. 非部員は `/unauthorized` にリダイレクト

### 4. JWT Callback

JWTに追加:
- `studentId` - 学籍番号
- `profileImage` - Microsoftプロフィール画像

### 5. Session Callback

セッションに追加情報を付与

## 実装詳細
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

### 認証設定（src/auth.ts）

```typescript
export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [MicrosoftEntraId({ clientId, clientSecret, tenantId })],
    callbacks: { signIn, jwt, session, authorized },
    session: { maxAge: 60 * 60 * 24 * 180 }, // 180日
});
```

### 学籍番号の抽出

```typescript
function extractStudentId(email: string): string {
    return email.split("@")[0];
}
```

### 部員確認

```typescript
async function verifyMember(studentId: string): Promise<boolean> {
    const response = await fetch(`${GAS_API_URL}?path=verify-member&identifier=${studentId}`);
    const data = await response.json();
    return data.isMember === true;
}
```

### プロフィール画像取得

Microsoft Graph APIから96x96画像を取得、Base64エンコードして返却

## アクセス制御
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

### 認証不要

- `/login`
- `/`
- `/unauthorized`

### 認証必須

`(authenticated)`グループ配下:
- `/home`
- `/absence`
- `/bus`
- `/calendar`
- `/documents`
- `/items`
- `/memo`
- `/notifications`
- `/more`

## セッション情報
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

```typescript
interface Session {
    user: { name: string; email: string };
    studentId: string;
    profileImage?: string;
    expires: string;
}
```

## 環境変数
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

```bash
# 必須
AUTH_SECRET                           # JWT署名キー
AUTH_MICROSOFT_ENTRA_ID_ID            # クライアントID
AUTH_MICROSOFT_ENTRA_ID_SECRET        # クライアントシークレット
AUTH_MICROSOFT_ENTRA_ID_TENANT_ID     # テナントID

# GAS API（部員確認用）
NEXT_PUBLIC_GAS_API_URL               # GAS Web Apps URL
```

## トラブルシューティング
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

### 「部員として登録されていません」エラー

- GASスプレッドシートに学籍番号が登録されているか確認
- `verify-member` APIの動作確認

### セッションが維持されない

- `AUTH_SECRET`の設定確認
- Cookieの保存確認

### プロフィール画像が表示されない

- Microsoft Graph APIへのアクセス権限確認
- `User.Read`スコープの確認
