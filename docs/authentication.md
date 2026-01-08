# 認証

NB-Portal の認証システムについて説明する。

## 概要

- **認証プロバイダ**: Microsoft Entra ID（Azure AD）
- **認証ライブラリ**: NextAuth.js v5（Auth.js）
- **セッション管理**: JWT（署名付きトークン）
- **セッション有効期限**: 180 日

## 認証フロー

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│    User      │────▶│   /login     │────▶│    Microsoft     │
│              │     │    Page      │     │    Entra ID      │
└──────────────┘     └──────────────┘     └────────┬─────────┘
                                                   │
                                                   ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│    /home     │◀────│   signIn     │◀────│  OAuth Callback  │
│    Page      │     │   Callback   │     │  (get token)     │
└──────────────┘     └──────────────┘     └──────────────────┘
```

### 1. ログイン開始

ユーザーが `/login` ページで「Microsoft でログイン」ボタンをクリック。

### 2. Microsoft Entra ID 認証

OAuth 2.0 + OpenID Connect フローで認証を実行。

### 3. signIn Callback

認証成功後、以下の処理を実行:

1. メールアドレスから学籍番号を抽出
2. GAS API で部員確認（`verify-member`）
3. 部員でない場合は `/unauthorized` にリダイレクト

### 4. JWT Callback

JWT トークンに以下の情報を追加:

- `studentId`: 学籍番号
- `profileImage`: Microsoft プロフィール画像（初回のみ取得）

### 5. Session Callback

セッションオブジェクトに追加情報を付与。

## 実装詳細

### 認証設定（src/auth.ts）

```typescript
export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        MicrosoftEntraId({
            clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
            clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
            tenantId: process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID,
        }),
    ],
    callbacks: {
        signIn, // 部員確認
        jwt, // トークン拡張
        session, // セッション拡張
        authorized, // アクセス制御
    },
    session: {
        maxAge: 60 * 60 * 24 * 180, // 180日
    },
});
```

### 学籍番号の抽出

メールアドレスの`@`より前の部分を学籍番号として使用:

```typescript
function extractStudentId(email: string): string {
    return email.split("@")[0];
}
```

### 部員確認

GAS API の `verify-member` エンドポイントで確認:

```typescript
async function verifyMember(studentId: string): Promise<boolean> {
    const response = await fetch(
        `${GAS_API_URL}?path=verify-member&identifier=${studentId}`
    );
    const data = await response.json();
    return data.isMember === true;
}
```

### プロフィール画像の取得

Microsoft Graph API から 96x96 の画像を取得:

```typescript
async function getProfileImage(accessToken: string): Promise<string | null> {
    const response = await fetch(
        "https://graph.microsoft.com/v1.0/me/photos/96x96/$value",
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    // Base64エンコードして返却
}
```

## アクセス制御

### 認証不要ページ

- `/login` - ログインページ
- `/` - ルートページ（リダイレクト）
- `/unauthorized` - 未認可ページ

### 認証必須ページ

`(authenticated)` グループ配下のすべてのページ:

- `/home`
- `/absence`
- `/bus`
- `/calendar`
- `/documents`
- `/items`
- `/notifications`
- `/more`

### ミドルウェア（proxy.ts）

```typescript
export const config = {
    matcher: [
        // 静的ファイルとAPIを除外
        "/((?!_next|api|icons|documents|manifest.json|sw.js).*)",
    ],
};
```

## セッション情報

セッションオブジェクトの構造:

```typescript
interface Session {
    user: {
        name: string;
        email: string;
    };
    studentId: string; // 学籍番号
    profileImage?: string; // Base64画像データ
    expires: string; // 有効期限
}
```

## 環境変数

```bash
# 必須
AUTH_SECRET                              # JWT署名キー
AUTH_MICROSOFT_ENTRA_ID_ID               # クライアントID
AUTH_MICROSOFT_ENTRA_ID_SECRET           # クライアントシークレット
AUTH_MICROSOFT_ENTRA_ID_TENANT_ID        # テナントID

# GAS API（部員確認用）
NEXT_PUBLIC_GAS_API_URL                  # GAS Web Apps URL
```

## トラブルシューティング

### 「部員として登録されていません」エラー

- GAS のスプレッドシートに学籍番号が登録されているか確認
- `verify-member` API が正しく動作しているか確認

### セッションが維持されない

- `AUTH_SECRET` が正しく設定されているか確認
- Cookie が正しく保存されているか確認

### プロフィール画像が表示されない

- Microsoft Graph API へのアクセス権限を確認
- `User.Read` スコープが付与されているか確認
