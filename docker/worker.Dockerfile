FROM oven/bun:1.3.7-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps apps
COPY packages packages
RUN bun install --frozen-lockfile

FROM oven/bun:1.3.7-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app ./
COPY . .
RUN cd packages/db \
  && DATABASE_URL="postgresql://placeholder" bun --bun run prisma generate

EXPOSE 4001
WORKDIR /app/apps/worker
CMD ["bun", "src/index.ts"]
