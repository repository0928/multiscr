FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

EXPOSE 8080

# 啟動時 skip-generate（已在 build 完成），限制 Node 記憶體 80MB
CMD ["sh", "-c", "npx prisma db push --accept-data-loss --skip-generate && node --max-old-space-size=80 src/app.js"]
