FROM node:20-bookworm AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
RUN npm install prisma@5.22.0 @prisma/client@5.22.0

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
ENV PORT 3000
CMD ["node", "node_modules/next/dist/bin/next", "start"]