# # ---- Production Stage ----
# FROM node:20-alpine AS production
# WORKDIR /usr/src/app
# ENV NODE_ENV=production

# COPY --from=build /usr/src/app/node_modules ./node_modules
# COPY --from=build /usr/src/app/dist ./dist
# COPY --from=build /usr/src/app/prisma ./prisma

# EXPOSE 3001

# CMD ["node", "dist/src/main.js"]
# --- Stage 1: Builder ---
FROM node:22.14.0-alpine AS builder

WORKDIR /app

# Install system dependencies required for Prisma & Sharp (if used)
RUN apk add --no-cache openssl

# Copy package files first to leverage caching
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the NestJS application
RUN npm run build

# --- Stage 2: Runner ---
FROM node:22.14.0-alpine AS runner

WORKDIR /app

# Install production dependencies only
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --only=production

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Expose the application port (Fastify usually defaults to 3000)
EXPOSE 3000

# Start the application
CMD ["node", "dist/src/main.js"]