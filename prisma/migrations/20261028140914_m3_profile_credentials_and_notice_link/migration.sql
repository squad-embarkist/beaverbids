-- AlterTable
ALTER TABLE "company_profile" ADD COLUMN     "indigenousBusiness" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "securityClearance" TEXT;

-- AlterTable
ALTER TABLE "tender" ALTER COLUMN "officialUrl" DROP NOT NULL;
