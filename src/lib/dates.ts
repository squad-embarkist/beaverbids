const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days from `now` to `date`, rounded up, so a tender closing later
// today is 0 and one closing tomorrow morning is 1. Never negative.
export function daysUntil(date: Date | string, now: Date = new Date()): number {
  const target = typeof date === "string" ? new Date(date) : date;
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / DAY_MS));
}

export const CLOSING_SOON_DAYS = 7;
