import { getTranslations } from "next-intl/server";
import { DemoRequestForm } from "./demo-request-form";
import { Highlight } from "./highlight";

// "Request a live demo": stone column with the 6 px signal rule and the RE,
// TERR and RESP lines; paper column with the form. The address is the
// same value the form's email link uses.
export async function DemoRequest({ email }: { email: string }) {
  const t = await getTranslations("Landing.request");
  const facts = [
    { label: t("reLabel"), value: email, href: `mailto:${email}` },
    { label: t("terrLabel"), value: t("terr") },
    { label: t("respLabel"), value: t("resp") },
  ];

  return (
    <section id="request-a-demo" aria-labelledby="request-title" className="scroll-mt-header bg-stone">
      <div className="mx-auto grid w-full max-w-[1240px] lg:grid-cols-[670fr_570fr]">
        <div className="border-l-[6px] border-signal px-4 py-12 md:px-10 md:py-20">
          <p className="font-mono text-eyebrow uppercase text-ink-muted">{t("eyebrow")}</p>
          <h2
            id="request-title"
            className="mt-4 font-heading font-expanded font-extrabold text-section-sm text-asphalt md:text-section"
          >
            <span className="block">{t("titleLine1")}</span>
            <Highlight lines={[t("highlight")]} />
          </h2>
          <p className="mt-6 max-w-[448px] text-lead text-asphalt/80">{t("lead")}</p>
          <dl className="mt-10 flex flex-col gap-4 font-mono text-mono-md">
            {facts.map((fact) => (
              <div key={fact.label} className="flex flex-wrap gap-x-1">
                <dt className="text-ink-muted">{fact.label}</dt>
                <dd className="text-asphalt/70">
                  {fact.href ? (
                    <a href={fact.href} className="underline-offset-4 hover:underline">
                      {fact.value}
                    </a>
                  ) : (
                    fact.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="bg-paper px-4 py-12 md:px-10 md:py-20">
          <DemoRequestForm address={email} />
        </div>
      </div>
    </section>
  );
}
