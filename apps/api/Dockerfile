# Multi-stage build — runs from REPO ROOT (monorepo context)
# Render: set Root Directory to EMPTY (repo root), use Docker runtime

# ── Stage 1: Build ─────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace manifest first
COPY package.json package-lock.json ./

# Copy only the API app
COPY apps/api ./apps/api

# Install deps from repo root (resolves workspace packages correctly)
RUN npm install --prefix apps/api

# Generate Prisma client (resolves to apps/api/node_modules)
RUN cd apps/api && npx prisma generate

# Compile TypeScript
RUN cd apps/api && npx tsc -p tsconfig.build.json

# ── Stage 2: Production Runtime ────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app/apps/api

ENV NODE_ENV=production

# Copy compiled output from builder
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./package.json

# Uploads dir for local fallback
RUN mkdir -p uploads/resumes uploads/attachments

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
