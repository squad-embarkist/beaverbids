import type { SendEmailJob } from "@/lib/queues";
import type { EmailConfig } from "../config";
import { emailTranslator } from "../i18n";
import { renderShellHtml, renderShellText, type ShellContent } from "./shell";

// Renders one of the two transactional emails from a send-email job. Copy
// comes from the Email namespace in messages/<locale>.json; the frames are
// "(email) confirm address" (34:6784) and "(email) reset password" (34:7183).

export type RenderedEmail = { subject: string; html: string; text: string };

export type RenderContext = Pick<EmailConfig, "supportEmail" | "postalAddress" | "appUrl"> & { now?: Date };

export function renderEmail(job: SendEmailJob, ctx: RenderContext): RenderedEmail {
  const t = emailTranslator(job.locale);
  const year = (ctx.now ?? new Date()).getFullYear();
  const shared = {
    logoUrl: `${ctx.appUrl}/email/logo-dark.png`,
    brand: t("footer.brand"),
    greeting: t("greeting", { name: job.params.name }),
    buttonNotWorking: t("buttonNotWorking"),
    postalAddress: ctx.postalAddress,
    copyright: t("footer.copyright", { year: String(year) }),
  };

  let content: ShellContent;
  switch (job.template) {
    case "confirm-email":
      content = {
        ...shared,
        subject: t("confirm.subject"),
        preheader: t("confirm.preheader"),
        eyebrow: t("confirm.eyebrow"),
        title: t("confirm.title"),
        body: t("confirm.body"),
        button: { label: t("confirm.button"), url: job.params.url },
        expiresBold: t("confirm.expiresBold"),
        expiresRest: t("confirm.expiresRest"),
        ignore: t("confirm.ignore"),
        footerNote: t("footer.tagline"),
      };
      break;
    case "reset-password":
      content = {
        ...shared,
        subject: t("reset.subject"),
        preheader: t("reset.preheader"),
        eyebrow: t("reset.eyebrow"),
        title: t("reset.title"),
        body: t("reset.body"),
        button: { label: t("reset.button"), url: job.params.url },
        expiresBold: t("reset.expiresBold"),
        expiresRest: t("reset.expiresRest"),
        ignore: t("reset.ignore", { supportEmail: ctx.supportEmail }),
        footerNote: t("reset.securityNote"),
      };
      break;
  }

  return { subject: content.subject, html: renderShellHtml(content), text: renderShellText(content) };
}
