FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate build metadata so commit/deploy values are available
# without manual env setup after `docker build`.
RUN COMMIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)" && \
    BUILD_TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)" && \
    APP_VERSION="$(node -p \"require('./package.json').version\" 2>/dev/null || echo unknown)" && \
    printf '{\"version\":\"%s\",\"commit\":\"%s\",\"deployed\":\"%s\"}\n' "$APP_VERSION" "$COMMIT_SHA" "$BUILD_TS" > .build-metadata.json

# Tell Docker to expect these variables during the build
ARG NEXT_PUBLIC_MODELSEED_API_URL
ARG NEXT_PUBLIC_USE_MODELSEED_API
ARG NEXT_PUBLIC_USE_NEW_PROXY

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built assets from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.build-metadata.json ./.build-metadata.json

# Expose port
EXPOSE 3000

# Start the application
USER nextjs

CMD ["node", "server.js"]
