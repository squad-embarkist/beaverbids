// A CanadaBuys notice page is the tender opportunities listing plus
// "tender-notice/" and the reference number as a slug: lower case, letters,
// digits and hyphens only. Checked Oct 29, 2026 on eight sample notices:
// "SSC-26-00034400:T" opens at ssc-26-00034400t and "PW-_NCS-030-11940" at
// pw-ncs-030-11940 (it is 404 with the underscore kept). A few notices
// answer 403 without a CanadaBuys account; the screen says so.
export const CANADABUYS_NOTICE_PATH = "https://canadabuys.canada.ca/en/tender-opportunities/tender-notice";

export function noticeSlug(referenceNumber: string): string {
  return referenceNumber.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export function noticePageUrlFor(referenceNumber: string): string | null {
  const slug = noticeSlug(referenceNumber);
  return slug ? `${CANADABUYS_NOTICE_PATH}/${slug}` : null;
}
