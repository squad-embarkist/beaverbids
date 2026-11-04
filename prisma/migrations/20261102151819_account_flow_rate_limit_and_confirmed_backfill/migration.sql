-- CreateTable
CREATE TABLE "rateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "rateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rateLimit_key_key" ON "rateLimit"("key");

-- Every account that exists before email confirmation ships was created
-- without it (staging testers, the development account). Mark them
-- confirmed so the deploy locks nobody out. Production has no users yet.
UPDATE "user" SET "emailVerified" = true WHERE "emailVerified" = false;
