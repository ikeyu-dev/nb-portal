# NB-Portal 使い方ガイド
<span style="display:block;height:3px;background:#2a83a2;margin-top:-8px;margin-bottom:16px;"></span>

## 目次
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

1. [ログイン](#ログイン)
2. [ホーム画面](#ホーム画面)
3. [カレンダー](#カレンダー)
4. [欠席連絡](#欠席連絡)
5. [機材管理](#機材管理)
6. [バス時刻表](#バス時刻表)
7. [部会メモ](#部会メモ)
8. [プッシュ通知](#プッシュ通知)
9. [PWAインストール](#pwaインストール)

## ログイン
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

1. NB-Portalにアクセス
2. 「Microsoftでログイン」をタップ
3. 大学のMicrosoftアカウントでログイン

> **注意**: 部員として登録されていないアカウントはログイン不可

## ホーム画面
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

- **日付・時刻** - 現在時刻
- **天気** - 現在地の天気
- **今後の予定** - 直近のスケジュール
- **本日の欠席者** - 今日の欠席部員

## カレンダー
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

### 予定の確認

- 月表示で予定一覧
- 日付タップで詳細表示

### 予定の登録

1. 「+」ボタンをタップ
2. 情報を入力
   - タイトル（必須）
   - 終日 / 時刻
   - 日付 / 終了日
   - 場所・詳細・色
3. 「追加」をタップ

### 予定の編集・削除

1. 予定をタップ
2. 編集画面で修正 or 「削除」をタップ

## 欠席連絡
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

1. 学籍番号・氏名を入力
2. 種類を選択
   - 欠席 / 遅刻 / 中抜け / 早退
3. 種別に応じた追加情報
   - 中抜け: 抜ける時間・戻る時間
   - 早退: 早退時間
4. 理由を入力
5. 「送信」をタップ

## 機材管理
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

### カテゴリ

| コード | 種類 |
|--------|------|
| MIC | マイク |
| SPK | スピーカー |
| CAB | ケーブル |
| OTH | その他 |

### 操作

- **確認** - カテゴリでフィルタ可能
- **登録** - 「+」→ カテゴリ・名前・数量を入力
- **編集** - 行タップ → 名前を修正
- **削除** - 編集画面 → 「削除」

> **備考**: IDは自動生成（例: MIC001）

## バス時刻表
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

- 東武動物公園駅・新白岡駅のバス時刻表
- 日付選択で確認

## 部会メモ
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

### 作成手順

1. 基本情報を入力（日付・時刻・場所）
2. 今後の予定を追加（タイトル・詳細）
3. 会計・文団・その他を入力
4. 次回部会の情報を入力
5. プレビューで確認
6. 「マークダウンをコピー」

### 出力例

```markdown
## 1/15(水) 21:00- 部会@Discord

### ◯ 今後の予定

-   1/20(月) 新年会
    -   場所は学友会館を予定

### ◯ 会計

@部費滞納者
計画的に部費の支払いをお願いします

### ◯ 文団

特になし

### 次回部会

**1/22(水) 21:00- 部会@Discord**
```

## プッシュ通知
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

### 有効化

1. 「お知らせ」ページを開く
2. 「プッシュ通知」をオン
3. ブラウザの通知許可を許可

### 無効化

1. 「お知らせ」ページを開く
2. 「プッシュ通知」をオフ

### 通知タイプ

| タイプ | タイトル |
|--------|----------|
| 追加 | 新規予定: {予定名} |
| 更新 | 予定更新: {予定名} |
| 削除 | 予定削除: {予定名} |

## PWAインストール
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

### iOS

1. Safariで開く
2. 共有ボタン → 「ホーム画面に追加」

### Android

1. Chromeで開く
2. メニュー → 「ホーム画面に追加」

### PC

1. Chromeで開く
2. アドレスバーのインストールアイコン → 「インストール」

## トラブルシューティング
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

### ログインできない

- 大学のMicrosoftアカウントを使用しているか確認
- 部員登録を確認

### 通知が届かない

1. ブラウザの通知設定を確認
2. プッシュ通知がオンか確認
3. 再度オン/オフを試す

### 画面が更新されない

- ブラウザをリロード
- キャッシュをクリア
