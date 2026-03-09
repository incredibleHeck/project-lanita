# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Set dummy DATABASE_URL for prisma generate (not needed at runtime, but required for generate)
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dummy"

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

# Set production environment
ENV NODE_ENV=production

WORKDIR /app

# Copy package.json for reference
COPY --from=builder /app/package.json ./

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy prisma directory (needed for migrations)
COPY --from=builder /app/prisma ./prisma

# Copy prisma config file
COPY --from=builder /app/prisma.config.ts ./

# Expose the application port
EXPOSE 3000

# Run migrations, seed (creates DEFAULT school + admin), then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/src/main.js"]
