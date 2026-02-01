FROM node:22.14.0-alpine3.20 AS deps
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22.14.0-alpine3.20 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY prisma ./prisma

ARG DATABASE_URL=DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

ARG TELEGRAM_BOT_TOKEN=TELEGRAM_BOT_TOKEN
ENV TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}

ARG TELEGRAM_BOT_NAME=TELEGRAM_BOT_NAME
ENV TELEGRAM_BOT_NAME=${TELEGRAM_BOT_NAME}

RUN npx prisma generate
RUN npm run build

FROM node:22.14.0-alpine3.20 AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG DATABASE_URL=DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

ARG TELEGRAM_BOT_TOKEN=TELEGRAM_BOT_TOKEN
ENV TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}

ARG TELEGRAM_BOT_NAME=TELEGRAM_BOT_NAME
ENV TELEGRAM_BOT_NAME=${TELEGRAM_BOT_NAME}

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY fonts ./fonts

ENV PORT=3000
EXPOSE ${PORT}

# Правильная обработка сигналов (graceful shutdown)
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/main"]
