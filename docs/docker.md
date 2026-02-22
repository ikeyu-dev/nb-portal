# Docker 開発環境

Docker を使用したローカル開発環境のセットアップ方法を説明する。

## 概要

macOS 上で開発する際、Tailwind CSS v4 が依存する `lightningcss` などのネイティブバイナリがプラットフォーム差異で問題を起こす場合がある。Docker を使うことで Linux 環境で統一的に開発できる。

## 前提条件

- Docker Desktop がインストールされていること
- `.env.local` がプロジェクトルートに配置されていること

## 起動方法

```bash
docker compose up
```

開発サーバーが `http://localhost:3009` で起動する。

## 構成ファイル

### Dockerfile

```dockerfile
# lightningcss(Tailwind CSS v4)がglibcを必要とするためslimを使用
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci
# macOS向けlockfileにLinux用ネイティブバイナリが含まれないため手動追加
RUN npm install --no-save \
    lightningcss-linux-arm64-gnu@1.30.2 \
    @tailwindcss/oxide-linux-arm64-gnu@4.1.17 \
    @img/sharp-linux-arm64@0.34.5 \
    @img/sharp-libvips-linux-arm64@1.2.4 \
    @unrs/resolver-binding-linux-arm64-gnu@1.11.1

EXPOSE 3009

CMD ["npm", "run", "dev", "--", "-p", "3009"]
```

- `node:20-slim`: glibc を含む軽量イメージ（`alpine` は musl のため不可）
- Linux ARM64 向けネイティブバイナリを手動追加（macOS の lockfile には含まれないため）

### compose.yaml

```yaml
services:
    app:
        build: .
        ports:
            - "3009:3009"
        volumes:
            - .:/app
            - /app/node_modules
            - /app/.next
        environment:
            - WATCHPACK_POLLING=true
            - CHOKIDAR_USEPOLLING=true
        env_file:
            - .env.local
```

- ソースコードをバインドマウントしてホットリロードに対応
- `node_modules` と `.next` は匿名ボリュームでホスト側と分離
- `WATCHPACK_POLLING` / `CHOKIDAR_USEPOLLING`: Docker 内でのファイル変更検知を有効化

## 注意事項

- ネイティブバイナリのバージョンは `package-lock.json` の依存と合わせる必要がある
- パッケージ更新時は `docker compose build --no-cache` で再ビルドする
