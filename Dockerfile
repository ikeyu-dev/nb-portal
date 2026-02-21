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
