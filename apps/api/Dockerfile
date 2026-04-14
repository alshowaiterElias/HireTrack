# HireTrack API — Dockerfile
# Multi-stage build: compile TypeScript → run slim production image

# ── Stage 1: Build ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install ALL deps (including devDeps for tsc)
COPY package*.json ./
COPY tsconfig*.json ./
RUN npm ci

# Copy source and compile
COPY src/ ./src/
COPY prisma/ ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Compile TypeScript → dist/
RUN npx nest build

# ── Stage 2: Production Runtime ────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install PRODUCTION deps only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output and Prisma client from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma/ ./prisma/

# Create uploads directory (used for resume attachments until S3 migration)
RUN mkdir -p uploads/resumes uploads/attachments

EXPOSE 4000

# Run database migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
