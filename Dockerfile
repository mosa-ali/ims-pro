# =========================================================
# STAGE 1 — BUILD STAGE
# =========================================================
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files first for cache optimization
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy full source code
COPY . .

# Copy docker env so Vite can read build variables
COPY .env.frontend .env

# Build application
RUN pnpm build


# =========================================================
# STAGE 2 — PRODUCTION STAGE
# =========================================================
FROM node:22-bookworm-slim AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# ---------------------------------------------------------
# Install Chromium + PDF dependencies
# ---------------------------------------------------------
RUN apt-get update && apt-get install -y \
    chromium \
    curl \
    ca-certificates \
    dumb-init \
    fonts-liberation \
    fonts-noto \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
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
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------
# Puppeteer Configuration
# ---------------------------------------------------------
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install production dependencies only
RUN pnpm install --frozen-lockfile

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy drizzle schema/migrations
COPY --from=builder /app/drizzle ./drizzle

# If runtime needs templates/static assets
COPY --from=builder /app/client/public ./client/public
# ---------------------------------------------------------
# Create temp folder for PDF generation
# ---------------------------------------------------------
RUN mkdir -p /tmp/pdf

# ---------------------------------------------------------
# Security → non-root user
# ---------------------------------------------------------
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

RUN chown -R appuser:appgroup /app /tmp/pdf

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
# Expose application port
# ---------------------------------------------------------
EXPOSE 5000

# ---------------------------------------------------------
# Use dumb-init to avoid zombie chromium processes
# ---------------------------------------------------------
ENTRYPOINT ["dumb-init", "--"]

# ---------------------------------------------------------
# Start application
# ---------------------------------------------------------
CMD ["node", "dist/index.js"]