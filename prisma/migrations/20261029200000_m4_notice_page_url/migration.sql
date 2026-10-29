-- M4: the notice's own page on the source portal, built by the adapter from
-- the reference number. Null for sources without one (the fixtures).
ALTER TABLE "tender" ADD COLUMN "noticePageUrl" TEXT;
