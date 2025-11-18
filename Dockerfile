FROM node:20-alpine AS base

WORKDIR /app

# 依存関係のインストール
FROM base AS deps
COPY package*.json ./
RUN npm ci

# ビルドステージ
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 本番用ステージ
FROM base AS runner
ENV NODE_ENV=production

# 本番用の依存関係のみをインストール
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ビルドされたファイルをコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env.example ./.env.example

# ポートを公開
EXPOSE 3000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# アプリケーション起動
CMD ["node", "dist/server.js"]
