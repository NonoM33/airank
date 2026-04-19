# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm@latest

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@latest

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# Fake DB URL for build time (Prisma needs it for code generation, not actual connection)
ENV DATABASE_URL="postgresql://fake:fake@localhost:5432/fake"

# Generate Prisma client
RUN pnpm prisma generate

# Build Next.js (skip DB connection during prerendering)
RUN pnpm build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema + config
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Install Prisma CLI + engines in an ISOLATED directory (avoids conflicts with standalone's node_modules)
RUN mkdir -p /opt/prisma \
  && cd /opt/prisma \
  && echo '{"name":"prisma-cli","version":"1.0.0","private":true}' > package.json \
  && npm install --no-save --omit=dev prisma@7.5.0 @prisma/engines@7.5.0 \
  && chown -R nextjs:nodejs /opt/prisma /app/prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/docker-entrypoint.sh ./
CMD ["sh", "docker-entrypoint.sh"]
