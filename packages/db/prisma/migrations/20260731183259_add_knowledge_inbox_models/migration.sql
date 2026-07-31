-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('TEXT', 'LINK');

-- CreateEnum
CREATE TYPE "IndexStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "MessageState" AS ENUM ('STREAMING', 'COMPLETE', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "SourceKind" NOT NULL,
    "indexStatus" "IndexStatus" NOT NULL DEFAULT 'PENDING',
    "url" TEXT,
    "rawText" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "embeddingModel" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "indexedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastAskedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chunks" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "headingPath" TEXT,
    "embeddedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "state" "MessageState" NOT NULL DEFAULT 'COMPLETE',
    "content" TEXT NOT NULL,
    "model" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "retrievalMs" INTEGER,
    "generationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citations" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "chunkId" TEXT,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "wasCited" BOOLEAN NOT NULL DEFAULT false,
    "snippet" TEXT,
    "headingPath" TEXT,

    CONSTRAINT "citations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "sources_userId_indexStatus_createdAt_idx" ON "sources"("userId", "indexStatus", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "sources_userId_lastAskedAt_idx" ON "sources"("userId", "lastAskedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "sources_userId_contentHash_key" ON "sources"("userId", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "chunks_sourceId_position_key" ON "chunks"("sourceId", "position");

-- CreateIndex
CREATE INDEX "messages_sourceId_createdAt_idx" ON "messages"("sourceId", "createdAt");

-- CreateIndex
CREATE INDEX "citations_messageId_wasCited_idx" ON "citations"("messageId", "wasCited");

-- CreateIndex
CREATE UNIQUE INDEX "citations_messageId_rank_key" ON "citations"("messageId", "rank");

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citations" ADD CONSTRAINT "citations_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citations" ADD CONSTRAINT "citations_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "chunks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
