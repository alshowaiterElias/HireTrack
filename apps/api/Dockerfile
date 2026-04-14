# Multi-stage build — runs from REPO ROOT (monorepo context)
# Render: Runtime=Docker, Dockerfile Path=apps/api/Dockerfile, Root Directory=EMPTY

# ── Stage 1: Build ─────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace manifest first
COPY package.json package-lock.json ./

# Copy only the API app
COPY apps/api ./apps/api

# Install ALL deps (including devDeps for tsc) in apps/api
RUN npm install --prefix apps/api

# Generate Prisma client — resolves into apps/api/node_modules
RUN cd apps/api && ./node_modules/.bin/prisma generate

# Compile TypeScript — use local binary, not npx (npx picks up wrong tsc@2 package)
RUN cd apps/api && ./node_modules/.bin/tsc -p tsconfig.build.json

# ── Stage 2: Production Runtime ────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app/apps/api

ENV NODE_ENV=production

# Copy compiled output, node_modules, and prisma schema from builder
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./package.json

# Uploads dir for local disk fallback (used when R2 is not configured)
RUN mkdir -p uploads/resumes uploads/attachments

EXPOSE 4000

# Run DB migrations then start — use local prisma binary
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main"]
