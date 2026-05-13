# ── Stage 1 : dépendances ────────────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# ── Stage 2 : build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables nécessaires au build (valeurs fictives — les vraies sont dans docker-compose)
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost/placeholder
ENV BETTER_AUTH_SECRET=build-placeholder-secret-32chars
ENV BETTER_AUTH_URL=http://localhost:3000
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm build

# ── Stage 3 : image finale ────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Fichiers statiques publics
COPY --from=builder /app/public ./public

# Build output standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
