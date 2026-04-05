FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json index.ts ./
RUN npm run build

FROM node:20-slim

RUN useradd -m -u 1001 nodeuser

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && chown -R nodeuser:nodeuser /app

COPY --from=builder --chown=nodeuser:nodeuser /app/dist ./dist

USER nodeuser

EXPOSE 3001

CMD ["node", "dist/index.js"]
