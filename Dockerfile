# =========================================================
# STAGE 1 — BUILD STAGE (TypeScript compilation)
# =========================================================
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files first (better layer caching)
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install all dependencies (including devDependencies for TypeScript compilation)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Copy environment file for build-time variables
COPY .env.frontend .env

# Compile TypeScript to JavaScript
RUN pnpm build

# =========================================================
# STAGE 2 — RUNTIME STAGE
# =========================================================
FROM node:22-bookworm-slim AS production

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true

# ---------------------------------------------------------
# Install system dependencies for Chromium + PDF rendering
# ---------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Chromium and browser dependencies
    chromium \
    ca-certificates \
    fonts-liberation \
    fonts-noto \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    # Audio/media libraries
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    # Network/display libraries
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxshmfence1 \
    # Utilities
    curl \
    dumb-init \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------
# Install Node runtime dependencies only
# ---------------------------------------------------------
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install production dependencies only (no devDependencies)
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------
# Copy compiled application from builder
# ---------------------------------------------------------
COPY --from=builder /app/dist ./dist

# Copy database schema/migrations
COPY --from=builder /app/drizzle ./drizzle

# Copy static assets if needed by runtime
COPY --from=builder /app/client/public ./client/public

# ---------------------------------------------------------
# Create required runtime directories
# ---------------------------------------------------------
RUN mkdir -p /tmp/pdf /app/logs

# ---------------------------------------------------------
# Create non-root user for security
# ---------------------------------------------------------
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Change ownership to non-root user
RUN chown -R appuser:appuser /app /tmp/pdf

USER appuser

# ---------------------------------------------------------
# Health Check
# ---------------------------------------------------------
HEALTHCHECK --interval=30s \
  --timeout=10s \
  --start-period=40s \
  --retries=3 \
  CMD curl --fail http://localhost:5000/api/health || exit 1

# ---------------------------------------------------------
# Expose port
# ---------------------------------------------------------
EXPOSE 5000

# ---------------------------------------------------------
# Entrypoint: Use dumb-init to handle zombie processes
# ---------------------------------------------------------
ENTRYPOINT ["dumb-init", "--"]

# ---------------------------------------------------------
# Start application
# ---------------------------------------------------------
CMD ["node", "dist/index.js"]
