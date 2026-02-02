# === BASE IMAGE ===
FROM node:22.14.0-alpine3.20 AS base
WORKDIR /app
RUN apk add --no-cache dumb-init

# === BUILD STAGE ===
FROM base AS build

ARG DATABASE_URL=DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

COPY package*.json ./
RUN npm ci
COPY . .

RUN npx prisma generate
RUN npm run build


# === PRODUCTION STAGE ===
FROM base AS production

ARG DATABASE_URL=DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

ARG TELEGRAM_BOT_TOKEN=TELEGRAM_BOT_TOKEN
ENV TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}

ARG TELEGRAM_BOT_NAME=TELEGRAM_BOT_NAME
ENV TELEGRAM_BOT_NAME=${TELEGRAM_BOT_NAME}

RUN addgroup -S nodejs && adduser -S nestjs -G nodejs
USER nestjs

WORKDIR /app

COPY --from=build --chown=nestjs:nodejs /app/package*.json ./
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/fonts ./fonts

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE ${PORT}

ENTRYPOINT ["dumb-init", "--"]

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
