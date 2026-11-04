import { PASSWORD_MIN } from "@/lib/schemas/auth";

// The "IT NEEDS TO BE" card on Set new password (node 34:3148). Length and
// match are known in the browser as the person types; whether the password
// differs from the last one is only known from the server's answer, so that
// row never ticks before a submit and only ever goes to "unmet".
export type ChecklistState = {
  length: boolean;
  match: boolean;
  different: "unknown" | "unmet";
};

export function checklistState({ password, confirm, sameAsOld = false }: { password: string; confirm: string; sameAsOld?: boolean }, min: number = PASSWORD_MIN): ChecklistState {
  return {
    length: password.length >= min,
    match: password.length > 0 && password === confirm,
    different: sameAsOld ? "unmet" : "unknown",
  };
}
