# =======================================================
# Multi-Stage Production Dockerfile for AWS Cloud Clubs Tracking System
# =======================================================

# Step 1: Build Admin Dashboard
FROM node:20-alpine AS frontend-builder
WORKDIR /app/admin-dashboard
COPY admin-dashboard/package*.json ./
RUN npm ci
COPY admin-dashboard/ ./
RUN npm run build

# Step 2: Build Node.js Backend & Package Full-Stack Server
FROM node:20-alpine AS runner
WORKDIR /app

# Install native compilation dependencies for SQLite if needed
RUN apk add --no-cache python3 make g++

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production

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
