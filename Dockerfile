# =======================================================
# Multi-Stage Production Dockerfile for AWS Cloud Clubs Tracking System
# Using Node 22 (Debian Bookworm) for prebuilt glibc SQLite support
# =======================================================

# Step 1: Build Admin Dashboard
FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /app/admin-dashboard
COPY admin-dashboard/package*.json ./
RUN npm ci
COPY admin-dashboard/ ./
RUN npm run build

# Step 2: Build Node.js Backend & Package Full-Stack Server
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# Install standard native compilation tools if needed
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy server application source code
COPY server/ ./

# Copy built frontend assets from builder stage
COPY --from=frontend-builder /app/admin-dashboard/dist /app/admin-dashboard/dist

# Initialize/seed SQLite database on build
RUN node src/db.js

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

# Start server
CMD ["node", "src/index.js"]
