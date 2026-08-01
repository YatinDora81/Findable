FROM oven/bun:1.3.7-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY apps/web/package.json apps/web/
COPY apps/docs/package.json apps/docs/
COPY packages/config/package.json packages/config/
COPY packages/contracts/package.json packages/contracts/
COPY packages/db/package.json packages/db/
COPY packages/logger/package.json packages/logger/
COPY packages/queue/package.json packages/queue/
COPY packages/rag/package.json packages/rag/
COPY packages/ui/package.json packages/ui/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/typescript-config/package.json packages/typescript-config/
RUN bun install --frozen-lockfile

FROM oven/bun:1.3.7-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
ARG NEXT_PUBLIC_WORKER_URL=http://localhost:4001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WORKER_URL=$NEXT_PUBLIC_WORKER_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app ./
COPY . .
RUN cd packages/db \
  && DATABASE_URL="postgresql://placeholder" bun --bun run prisma generate
RUN cd apps/web && bun run build

FROM builder AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
WORKDIR /app/apps/web
CMD ["bun", "run", "start"]
