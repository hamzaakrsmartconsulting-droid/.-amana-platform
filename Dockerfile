# syntax=docker/dockerfile:1.7
# ============================================================================
# AMANA Patrimoine - Image Docker production
# Build multi-stage Next.js 16 (App Router) + standalone output
# ============================================================================

# ---------- 1. deps : installation des dépendances ----------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- 2. builder : build Next.js ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Les NEXT_PUBLIC_* doivent être présents AU BUILD (inlinés dans le bundle client).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_ORIAS_NUM
ARG NEXT_PUBLIC_CALENDLY_URL
ARG NEXT_PUBLIC_CALENDLY_PREMIUM_URL

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_ORIAS_NUM=$NEXT_PUBLIC_ORIAS_NUM \
    NEXT_PUBLIC_CALENDLY_URL=$NEXT_PUBLIC_CALENDLY_URL \
    NEXT_PUBLIC_CALENDLY_PREMIUM_URL=$NEXT_PUBLIC_CALENDLY_PREMIUM_URL

RUN npm run build

# ---------- 3. runner : image finale, ultra-légère ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN apk add --no-cache wget && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
