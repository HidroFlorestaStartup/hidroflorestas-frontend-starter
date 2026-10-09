// Matriz de permissões contextuais. Ocultar ações melhora a UX, mas a autorização real é do servidor.
import type { LabContext } from "./types";

export type LabAction =
  | "createArea"
  | "registerCollection"
  | "registerEnvironmental"
  | "manageIhfr"
  | "manageMembers"
  | "deactivateOrDelete";

export function can(ctx: LabContext | undefined, action: LabAction): boolean {
  if (!ctx) return false;
  const active = ctx.status === "ACTIVE" && !ctx.readOnly;
  const r = ctx.membershipRole;
  switch (action) {
    case "createArea":
    case "manageIhfr":
      return active && (r === "OWNER" || r === "ADMIN");
    case "registerCollection":
    case "registerEnvironmental":
      return active;
    case "manageMembers":
      return active && r === "OWNER";
    case "deactivateOrDelete":
      return r === "OWNER";
  }
}
