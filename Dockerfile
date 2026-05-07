FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Tell Docker to expect these variables during the build
ARG NEXT_PUBLIC_MODELSEED_API_URL
ARG NEXT_PUBLIC_USE_MODELSEED_API
ARG NEXT_PUBLIC_USE_NEW_PROXY
ARG NEXT_PUBLIC_GIT_VERSION
ARG NEXT_PUBLIC_GIT_COMMIT
ARG NEXT_PUBLIC_GIT_BRANCH
ARG NEXT_PUBLIC_DEPLOY_DATE

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

# Expose port
EXPOSE 3000

# Start the application
USER nextjs

CMD ["node", "server.js"]
