# アーキテクチャ
<span style="display:block;height:3px;background:#2a83a2;margin-top:-8px;margin-bottom:16px;"></span>

## ディレクトリ構成
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

```
nb-portal/
├── app/                          # Next.js App Router
│   ├── (authenticated)/          # 認証保護ページ
│   │   ├── home/                 # ダッシュボード
│   │   ├── absence/              # 欠席管理
│   │   ├── bus/                  # バス時刻表
│   │   ├── calendar/             # カレンダー
│   │   ├── documents/            # ドキュメント
│   │   ├── items/                # 機材管理
│   │   ├── memo/                 # 部会メモ
│   │   ├── notifications/        # 通知ログ
│   │   ├── more/                 # その他
│   │   └── layout.tsx            # 認証レイアウト
│   ├── api/                      # APIルート
│   ├── login/                    # ログイン
│   └── unauthorized/             # 未認可
├── src/
│   ├── auth.ts                   # 認証設定
│   ├── features/                 # 機能モジュール
│   ├── widgets/                  # ウィジェット
│   └── shared/                   # 共有リソース
├── public/
│   ├── sw.js                     # Service Worker
│   └── manifest.json             # PWAマニフェスト
├── gas/                          # Google Apps Script
└── docs/                         # ドキュメント
```

## レイヤー構成
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

### プレゼンテーション層

- `app/` - Next.js App Router
- `(authenticated)` - 認証必須ページのグループ
- `layout.tsx` - サイドバー・ドック共通レイアウト

### フィーチャー層

```
src/features/
├── analog-clock/         # 時計
├── bus-schedule/         # バス時刻表
├── date-display/         # 日付表示
├── meeting-memo/         # 部会メモ
├── profile-image/        # プロフィール画像
├── push-notification/    # プッシュ通知
├── pwa-install/          # PWAインストール
├── schedule-card/        # スケジュールカード
├── theme-toggle/         # テーマ切替
└── weather/              # 天気
```

### ウィジェット層

```
src/widgets/
├── header/     # ヘッダー
├── sidebar/    # サイドバー（PC）
└── dock/       # ボトムドック（モバイル）
```

### 共有層

```
src/shared/
├── api/        # APIクライアント
├── types/      # 型定義
├── lib/        # ユーティリティ
├── styles/     # グローバルスタイル
└── ui/         # 基本UI
```

## データフロー
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

```
┌──────────────────────────────────────────────────────┐
│                    クライアント                        │
│   Pages → Features → Shared                          │
└───────────────────────┬──────────────────────────────┘
                        ▼
┌──────────────────────────────────────────────────────┐
│               Next.js API Routes                      │
│   /api/auth  │  /api/push-*  │  /api/schedule        │
└───────┬──────────────┬──────────────┬────────────────┘
        ▼              ▼              ▼
┌───────────────┐ ┌───────────┐ ┌────────────────────┐
│ Microsoft     │ │ Web Push  │ │ Google Apps Script │
│ Entra ID      │ │ (VAPID)   │ └─────────┬──────────┘
└───────────────┘ └───────────┘           ▼
                                ┌────────────────────┐
                                │   Google Sheets    │
                                └────────────────────┘
```

## 主要機能
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

| 機能 | 実装場所 | 説明 |
|------|---------|------|
| 認証 | `src/auth.ts` | Microsoft Entra ID SSO |
| ダッシュボード | `app/(authenticated)/home/` | スケジュール・天気・時計 |
| カレンダー | `app/(authenticated)/calendar/` | イベントCRUD |
| 欠席管理 | `app/(authenticated)/absence/` | 欠席連絡送信 |
| 機材管理 | `app/(authenticated)/items/` | 機材CRUD |
| バス時刻表 | `app/(authenticated)/bus/` | NITページスクレイピング |
| 部会メモ | `app/(authenticated)/memo/` | マークダウン生成 |
| ドキュメント | `app/(authenticated)/documents/` | PDFビューアー |
| プッシュ通知 | `src/features/push-notification/` | Web Push API |
| PWA | `public/sw.js` | オフライン対応 |

## レスポンシブ対応
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

### PC

```
┌──────────────────────────────────────────┐
│ Header                                   │
├────────────┬─────────────────────────────┤
│  Sidebar   │         Content             │
└────────────┴─────────────────────────────┘
```

### モバイル

```
┌──────────────────────────────────────────┐
│ Header                                   │
├──────────────────────────────────────────┤
│              Content                     │
├──────────────────────────────────────────┤
│              Dock                        │
└──────────────────────────────────────────┘
```
