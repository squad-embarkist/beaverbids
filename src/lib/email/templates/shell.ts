// The email shell drawn on the Figma frames "(email) confirm address"
// (34:6784) and "(email) reset password" (34:7183): a 600 px column on the
// field colour, an asphalt header with the logo and wordmark, the 6 px
// signal rule, the body sections, and an asphalt footer. Table layout and
// inline styles, because that is what mail clients render; the tokens are
// hex constants here because no stylesheet reaches an inbox. Archivo and
// IBM Plex Mono are named first and fall back to the client's sans and
// mono faces, keeping the weights and the uppercase.

export const EMAIL_COLOURS = {
  signal: "#d52b1e",
  asphalt: "#23231f",
  paper: "#f4f2ed",
  field: "#faf9f6",
  stoneLight: "#dedbd3",
  inkStrong: "#4f4c47",
  inkOnDark: "#a9a59d",
  white: "#ffffff",
} as const;

const SANS = "Archivo, Arial, Helvetica, sans-serif";
const MONO = "'IBM Plex Mono', Menlo, Consolas, monospace";

export type ShellContent = {
  subject: string;
  // Hidden preview line some clients show beside the subject.
  preheader: string;
  logoUrl: string;
  brand: string;
  eyebrow: string;
  title: string;
  greeting: string;
  body: string;
  button: { label: string; url: string };
  buttonNotWorking: string;
  expiresBold: string;
  expiresRest: string;
  ignore: string;
  footerNote: string;
  postalAddress: string;
  copyright: string;
};

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Only http(s) links go into an href; anything else would be a bug upstream.
export function safeUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) throw new Error(`Email link is not an http(s) URL: ${JSON.stringify(url)}`);
  return escapeHtml(url);
}

export function renderShellHtml(c: ShellContent): string {
  const C = EMAIL_COLOURS;
  const href = safeUrl(c.button.url);
  const sans = `font-family:${SANS};`;
  const mono = `font-family:${MONO};`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(c.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.field};">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${C.field};">${escapeHtml(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.field};">
<tr><td align="center" style="padding:0;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:${C.field};">
<tr><td style="background:${C.asphalt};padding:22px 40px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding:0 10px 0 0;vertical-align:middle;"><img src="${safeUrl(c.logoUrl)}" width="33" height="32" alt="" style="display:block;width:33px;height:32px;border:0;"></td>
<td style="vertical-align:middle;${sans}font-weight:800;font-stretch:125%;font-size:24px;line-height:32px;letter-spacing:-0.24px;color:${C.paper};">${escapeHtml(c.brand)}</td>
</tr></table>
</td></tr>
<tr><td style="background:${C.signal};height:6px;line-height:6px;font-size:6px;">&nbsp;</td></tr>
<tr><td style="padding:44px 40px 0 40px;">
<p style="margin:0;${mono}font-weight:500;font-size:11px;line-height:14px;letter-spacing:1.98px;text-transform:uppercase;color:${C.inkStrong};">${escapeHtml(c.eyebrow)}</p>
<h1 style="margin:14px 0 0 0;${sans}font-weight:800;font-size:34px;line-height:36px;letter-spacing:0.34px;text-transform:uppercase;color:${C.asphalt};">${escapeHtml(c.title)}</h1>
<p style="margin:20px 0 0 0;${sans}font-size:16px;line-height:26px;color:${C.asphalt};">${escapeHtml(c.greeting)}</p>
<p style="margin:16px 0 0 0;${sans}font-size:16px;line-height:26px;color:${C.asphalt};">${escapeHtml(c.body)}</p>
</td></tr>
<tr><td style="padding:32px 40px 32px 40px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:${C.signal};"><a href="${href}" style="display:inline-block;padding:0 34px;${sans}font-weight:700;font-size:13px;line-height:50px;letter-spacing:0.78px;text-transform:uppercase;color:${C.white};text-decoration:none;">${escapeHtml(c.button.label)}</a></td>
</tr></table>
</td></tr>
<tr><td style="padding:0 40px 32px 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${C.stoneLight};padding:20px 22px;">
<p style="margin:0;${mono}font-weight:500;font-size:10px;line-height:13px;letter-spacing:2px;text-transform:uppercase;color:${C.inkStrong};">${escapeHtml(c.buttonNotWorking)}</p>
<p style="margin:8px 0 0 0;${mono}font-size:12px;line-height:20px;color:${C.asphalt};word-break:break-all;"><a href="${href}" style="color:${C.asphalt};text-decoration:underline;">${href}</a></p>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 40px 44px 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${C.stoneLight};padding:22px 0 0 0;">
<p style="margin:0;${sans}font-size:14px;line-height:22px;color:${C.inkStrong};"><strong style="font-weight:700;color:${C.asphalt};">${escapeHtml(c.expiresBold)}</strong> ${escapeHtml(c.expiresRest)}</p>
<p style="margin:12px 0 0 0;${sans}font-size:14px;line-height:22px;color:${C.inkStrong};">${escapeHtml(c.ignore)}</p>
</td></tr></table>
</td></tr>
<tr><td style="background:${C.asphalt};padding:30px 40px;">
<p style="margin:0;${sans}font-weight:800;font-stretch:125%;font-size:15px;line-height:19px;letter-spacing:0.6px;color:${C.paper};">${escapeHtml(c.brand)}</p>
<p style="margin:10px 0 0 0;${sans}font-size:13px;line-height:21px;color:${C.inkOnDark};">${escapeHtml(c.footerNote)}</p>
<p style="margin:16px 0 0 0;${mono}font-weight:500;font-size:10px;line-height:13px;letter-spacing:1.2px;text-transform:uppercase;color:${C.inkOnDark};">${escapeHtml(c.postalAddress)}<br>${escapeHtml(c.copyright)}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`;
}

// The same content as plain text, the link on its own line so every client
// makes it clickable.
export function renderShellText(c: ShellContent): string {
  return [
    c.eyebrow,
    c.title,
    "",
    c.greeting,
    "",
    c.body,
    "",
    `${c.button.label}:`,
    c.button.url,
    "",
    `${c.expiresBold} ${c.expiresRest}`,
    "",
    c.ignore,
    "",
    c.brand,
    c.footerNote,
    c.postalAddress,
    c.copyright,
  ].join("\n");
}
