"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildDemoRequestMailto } from "@/lib/demo-request";
import {
  DEMO_REQUEST_FIELDS,
  demoRequestSchema,
  isDemoRequestErrorKey,
  isDemoRequestField,
  type DemoRequestErrorKey,
  type DemoRequestField,
} from "@/lib/schemas/demo-request";

type FieldErrors = Partial<Record<DemoRequestField, DemoRequestErrorKey>>;

const FIELDS: Array<{
  name: DemoRequestField;
  type: "text" | "email";
  autoComplete: string;
  span: "half" | "full";
}> = [
  { name: "name", type: "text", autoComplete: "name", span: "half" },
  { name: "company", type: "text", autoComplete: "organization", span: "half" },
  { name: "email", type: "email", autoComplete: "email", span: "full" },
  { name: "province", type: "text", autoComplete: "address-level1", span: "half" },
  { name: "trade", type: "text", autoComplete: "organization-title", span: "half" },
];

// The demo form validates in the browser and opens the visitor's email client
// with the answers; nothing is sent to our servers (no email in the MVP).
export function DemoRequestForm({ address }: { address: string }) {
  const t = useTranslations("Landing.request.form");
  const tErrors = useTranslations("Landing.request.errors");
  const [errors, setErrors] = useState<FieldErrors>({});

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const raw = Object.fromEntries(DEMO_REQUEST_FIELDS.map((field) => [field, data.get(field) ?? ""]));
    const result = demoRequestSchema.safeParse(raw);

    if (!result.success) {
      const next: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (isDemoRequestField(field) && !next[field] && isDemoRequestErrorKey(issue.message)) {
          next[field] = issue.message;
        }
      }
      setErrors(next);
      const first = DEMO_REQUEST_FIELDS.find((field) => next[field]);
      if (first) form.querySelector<HTMLInputElement>(`#demo-${first}`)?.focus();
      return;
    }

    setErrors({});
    window.location.href = buildDemoRequestMailto(
      address,
      t("subject", { company: result.data.company }),
      result.data,
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex w-full max-w-[490px] flex-col">
      <div className="grid gap-5 sm:grid-cols-2">
        {FIELDS.map((field) => {
          const id = `demo-${field.name}`;
          const errorId = `${id}-error`;
          const error = errors[field.name];
          return (
            <div
              key={field.name}
              className={field.span === "full" ? "flex flex-col gap-3 sm:col-span-2" : "flex flex-col gap-3"}
            >
              <label htmlFor={id} className="font-mono text-mono-xs uppercase text-ink-muted">
                {t(field.name)}
              </label>
              <Input
                id={id}
                name={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                inputMode={field.type === "email" ? "email" : undefined}
                placeholder={t(`${field.name}Placeholder`)}
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
              />
              {error ? (
                <p id={errorId} role="alert" className="text-sm leading-5 font-medium text-signal">
                  {tErrors(error)}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      <Button type="submit" className="mt-5 w-full">
        {t("submit")}
      </Button>
      <p className="mt-5 font-mono text-note text-ink-muted">{t("note")}</p>
    </form>
  );
}
