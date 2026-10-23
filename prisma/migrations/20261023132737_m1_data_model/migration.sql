-- CreateEnum
CREATE TYPE "Language" AS ENUM ('EN', 'FR', 'EN_FR');

-- CreateEnum
CREATE TYPE "ScoreBand" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "IngestRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "company_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "headOfficeProvince" TEXT,
    "capacity" TEXT,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "buyerTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "languages" "Language" NOT NULL DEFAULT 'EN',
    "regions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sizeMin" INTEGER,
    "sizeMax" INTEGER,
    "timelinePref" INTEGER,
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bonding" BOOLEAN NOT NULL DEFAULT false,
    "questionnaireStep" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "lastSuccessAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingest_run" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "IngestRunStatus" NOT NULL DEFAULT 'RUNNING',
    "rowsFound" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingest_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tender" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "buyer" TEXT NOT NULL,
    "buyerType" TEXT,
    "description" TEXT NOT NULL,
    "categoryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "region" TEXT NOT NULL,
    "valueMin" INTEGER,
    "valueMax" INTEGER,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "language" "Language" NOT NULL DEFAULT 'EN',
    "officialUrl" TEXT NOT NULL,
    "rawFileKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "band" "ScoreBand" NOT NULL,
    "eligible" BOOLEAN NOT NULL DEFAULT true,
    "factors" JSONB NOT NULL,
    "reasons" JSONB NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "scoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "score_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_profile_userId_key" ON "company_profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "source_code_key" ON "source"("code");

-- CreateIndex
CREATE INDEX "ingest_run_sourceId_startedAt_idx" ON "ingest_run"("sourceId", "startedAt");

-- CreateIndex
CREATE INDEX "tender_closesAt_idx" ON "tender"("closesAt");

-- CreateIndex
CREATE UNIQUE INDEX "tender_sourceId_externalId_key" ON "tender"("sourceId", "externalId");

-- CreateIndex
CREATE INDEX "score_profileId_total_idx" ON "score"("profileId", "total" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "score_tenderId_profileId_key" ON "score"("tenderId", "profileId");

-- AddForeignKey
ALTER TABLE "company_profile" ADD CONSTRAINT "company_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingest_run" ADD CONSTRAINT "ingest_run_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tender" ADD CONSTRAINT "tender_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score" ADD CONSTRAINT "score_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score" ADD CONSTRAINT "score_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "company_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
