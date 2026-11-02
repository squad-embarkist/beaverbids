-- M4: region becomes an array (the CanadaBuys file names several provinces
-- on one notice), notice type and kind, solicitation number, withdrawal
-- marker, and the ingest run summary. The existing region values are kept.

-- CreateEnum
CREATE TYPE "NoticeKind" AS ENUM ('BID', 'RFI', 'ACAN', 'DIRECTED', 'OTHER', 'UNKNOWN');

-- AlterTable
ALTER TABLE "ingest_run" ADD COLUMN     "summary" JSONB;

-- AlterTable: add the new columns first, copy region into regions, then drop region.
ALTER TABLE "tender" ADD COLUMN     "noticeKind" "NoticeKind" NOT NULL DEFAULT 'BID',
ADD COLUMN     "noticeType" TEXT,
ADD COLUMN     "regions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "solicitationNumber" TEXT,
ADD COLUMN     "withdrawnAt" TIMESTAMP(3);

UPDATE "tender" SET "regions" = ARRAY["region"];

ALTER TABLE "tender" DROP COLUMN "region";

-- CreateIndex
CREATE INDEX "tender_regions_idx" ON "tender" USING GIN ("regions");

-- CreateIndex
CREATE INDEX "tender_sourceId_withdrawnAt_idx" ON "tender"("sourceId", "withdrawnAt");
