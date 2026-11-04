import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "@playwright/test";

// The worker Playwright starts writes every email to a JSON file
// (EMAIL_TRANSPORT=file, playwright.config.ts), so a spec can read the link
// out of the newest message for an address without a mail server.
export const EMAIL_FILE_DIR = path.resolve(process.env.EMAIL_FILE_DIR || ".data/mail-e2e");

type StoredEmail = { messageId: string; sentAt: string; to: string; subject: string; text: string; html: string };

export async function listEmails(to: string): Promise<StoredEmail[]> {
  let files: string[];
  try {
    files = await readdir(EMAIL_FILE_DIR);
  } catch {
    return [];
  }
  const messages: StoredEmail[] = [];
  for (const file of files.filter((name) => name.endsWith(".json")).sort()) {
    const stored = JSON.parse(await readFile(path.join(EMAIL_FILE_DIR, file), "utf8")) as StoredEmail;
    if (stored.to.toLowerCase() === to.toLowerCase()) messages.push(stored);
  }
  return messages;
}

// Waits for the newest email to the address after `after` and returns the
// first http(s) link on its own line in the text version.
export async function waitForEmailLink(to: string, { after = 0, subject }: { after?: number; subject?: RegExp } = {}): Promise<string> {
  let link = "";
  await expect
    .poll(
      async () => {
        const messages = (await listEmails(to)).filter((m) => (subject ? subject.test(m.subject) : true));
        const newest = messages[messages.length - 1];
        if (!newest || messages.length <= after) return false;
        link = newest.text.split("\n").find((line) => /^https?:\/\//.test(line)) ?? "";
        return link !== "";
      },
      { timeout: 30_000, intervals: [500, 1_000, 2_000] },
    )
    .toBe(true);
  return link;
}
