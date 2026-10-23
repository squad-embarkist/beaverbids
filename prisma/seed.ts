// `npm run db:seed`, and what `prisma migrate reset` runs afterwards.
// Loads the fictional tenders from fixtures/ and, outside production, a dev
// sign-in with the sample company profile.
import "dotenv/config";
import { prisma } from "@/lib/db";
import { log } from "@/lib/log";
import { DEV_ACCOUNT, seedDevAccount } from "@/lib/seed/dev-account";
import { seedFixtures } from "@/lib/seed/fixtures";

async function main() {
  const fixtures = await seedFixtures(prisma);
  log.info("seeded fixture tenders", { count: fixtures.count, sourceId: fixtures.sourceId });

  if (process.env.NODE_ENV === "production") {
    log.info("skipped dev account (production)");
    return;
  }

  const dev = await seedDevAccount(prisma);
  log.info("seeded dev account", { email: DEV_ACCOUNT.email, profileId: dev.profileId });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
