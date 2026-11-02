// The short domain a link points at, for a button label: "merx.com" for
// https://www.merx.com/..., "ariba.com" for portal.us.bn.cloud.ariba.com.
// The last two labels are enough for the portals CanadaBuys links to; a
// country-code second level (co.uk) would show as "co.uk", which is still a
// readable label. Null when the value is not a web address.
export function linkDomain(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const labels = host.split(".").filter(Boolean);
    return labels.length > 2 ? labels.slice(-2).join(".") : host || null;
  } catch {
    return null;
  }
}
