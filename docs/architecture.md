# アーキテクチャ

NB-Portal のプロジェクト構成とアーキテクチャについて説明する。

## ディレクトリ構成

```
nb-portal/
├── app/                          # Next.js App Router
│   ├── (authenticated)/          # 認証保護レイアウトグループ
│   │   ├── home/                 # ダッシュボード
│   │   ├── absence/              # 欠席管理
│   │   ├── bus/                  # バス時刻表
│   │   ├── calendar/             # カレンダー
│   │   ├── documents/            # ドキュメント表示
│   │   ├── items/                # アイテム一覧
│   │   ├── notifications/        # 通知ログ
│   │   ├── more/                 # その他メニュー
│   │   └── layout.tsx            # 認証レイアウト
│   ├── api/                      # APIルート
│   │   ├── auth/[...nextauth]/   # NextAuthハンドラ
│   │   ├── push-subscribe/       # プッシュ購読管理
│   │   ├── push-send/            # プッシュ通知送信
│   │   ├── absence/              # 欠席連絡API
│   │   ├── schedule/             # スケジュール管理API
│   │   ├── items/                # 機材管理API
│   │   ├── gas/                  # GAS APIプロキシ
│   │   └── bus-schedule/         # バス時刻表API
│   ├── login/                    # ログインページ
│   ├── unauthorized/             # 未認可ページ
│   ├── layout.tsx                # ルートレイアウト
│   └── page.tsx                  # ルートページ
├── src/
│   ├── auth.ts                   # NextAuth認証設定
│   ├── components/               # 共通コンポーネント
│   ├── features/                 # フィーチャーモジュール
│   ├── widgets/                  # ページウィジェット
│   └── shared/                   # 共有リソース
│       ├── api/                  # APIクライアント
│       ├── types/                # 共有型定義
│       ├── lib/                  # ユーティリティ関数
│       ├── styles/               # グローバルスタイル
│       └── ui/                   # 基本UIコンポーネント
├── public/
│   ├── sw.js                     # Service Worker
│   ├── manifest.json             # PWAマニフェスト
│   ├── icons/                    # PWAアイコン
│   └── documents/                # ドキュメントストレージ
├── gas/                          # Google Apps Script
│   ├── main.js                   # GASメイン関数
│   └── appsscript.json           # GASプロジェクト設定
└── docs/                         # ドキュメント
```

## レイヤー構成

### プレゼンテーション層

```
app/
├── (authenticated)/    # 認証が必要なページ群
│   └── layout.tsx      # サイドバー、ドック、ヘッダーを含むレイアウト
└── login/              # 認証不要なページ
```

- Next.js App Router を使用
- Route Groups `(authenticated)` で認証が必要なページをグループ化
- `layout.tsx` で共通レイアウト（サイドバー、ドック）を提供

### フィーチャー層

```
src/features/
├── analog-clock/         # アナログ時計
├── bus-schedule/         # バス時刻表ウィジェット
├── date-display/         # 日付表示
├── profile-image/        # プロフィール画像
├── push-notification/    # プッシュ通知トグル
├── pwa-install/          # PWAインストール
├── schedule-card/        # スケジュールカード
├── theme-toggle/         # テーマ切り替え
└── weather/              # 天気ウィジェット
```

- 各機能を独立したモジュールとして実装
- UI コンポーネント、フック、ユーティリティを機能ごとにまとめる

### ウィジェット層

```
src/widgets/
├── header/     # ヘッダー
├── sidebar/    # サイドバー/ドロワー（PC用）
└── dock/       # ボトムドック（モバイル用）
```

- ページレイアウトを構成する大きなコンポーネント
- レスポンシブ対応（PC: サイドバー、モバイル: ドック）

### 共有層

```
src/shared/
├── api/        # APIクライアント（GAS API呼び出し）
├── types/      # 共有型定義（ApiResponse等）
├── lib/        # ユーティリティ関数
├── styles/     # グローバルスタイル（globals.css）
└── ui/         # 基本UIコンポーネント
```

## データフロー

```
┌────────────────────────────────────────────────────────────┐
│                         クライアント                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Pages     │───▶│  Features   │───▶│   Shared    │     │
│  │  (app/)     │    │ (src/feat)  │    │  (src/sh)   │     │
│  └─────────────┘    └─────────────┘    └──────┬──────┘     │
└────────────────────────────────────────────────────────────┘
                                                  │
                                                  ▼
┌────────────────────────────────────────────────────────────┐
│                       Next.js API Routes                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  /api/auth  │    │ /api/push-* │    │ /api/sched  │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
└────────────────────────────────────────────────────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Microsoft      │  │   Web Push      │  │  Google Apps    │
│  Entra ID       │  │   (VAPID)       │  │  Script API     │
└─────────────────┘  └─────────────────┘  └────────┬────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │  Google Sheets  │
                                          │  (データストア)   │
                                          └─────────────────┘
```

## 主要機能

| 機能           | 実装場所                          | 説明                               |
| -------------- | --------------------------------- | ---------------------------------- |
| 認証           | `src/auth.ts`                     | Microsoft Entra ID による SSO      |
| ダッシュボード | `app/(authenticated)/home/`       | スケジュール、欠席者、時計、天気   |
| 欠席管理       | `app/(authenticated)/absence/`    | 欠席連絡の送信                     |
| スケジュール   | `app/api/schedule/`               | CRUD 操作                          |
| バス時刻表     | `app/(authenticated)/bus/`        | NIT 公式ページのスクレイピング     |
| カレンダー     | `app/(authenticated)/calendar/`   | イベント管理                       |
| ドキュメント   | `app/(authenticated)/documents/`  | PDF ビューアー                     |
| 機材管理       | `app/(authenticated)/items/`      | 機材のCRUD操作（登録・編集・削除） |
| プッシュ通知   | `src/features/push-notification/` | Web Push API                       |
| PWA            | `public/sw.js`, `manifest.json`   | オフライン対応                     |

## レスポンシブ対応

- **PC**: サイドバーナビゲーション + ヘッダー
- **モバイル**: ボトムドック（X/Twitter 風 UI）+ ヘッダー

```
PC Layout:
┌──────────────────────────────────────────┐
│ Header                                   │
├────────────┬─────────────────────────────┤
│            │                             │
│  Sidebar   │         Content             │
│            │                             │
└────────────┴─────────────────────────────┘

Mobile Layout:
┌──────────────────────────────────────────┐
│ Header                                   │
├──────────────────────────────────────────┤
│                                          │
│              Content                     │
│                                          │
├──────────────────────────────────────────┤
│              Dock                        │
└──────────────────────────────────────────┘
```
