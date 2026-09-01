import type { FieldDef } from "./types";

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;
export const DEFAULT_MAX_LENGTH = 200;

/**
 * Strip control characters and enforce the per-field length cap. Human input
 * is never trimmed while typing (a controlled input would eat the space in
 * "Ada King"); agent input is trimmed.
 */
export function sanitize(def: FieldDef, raw: string, trim = true): string {
  const stripped = String(raw).replace(CONTROL_CHARS, "");
  const cleaned = trim ? stripped.trim() : stripped;
  const cap = def.maxLength ?? DEFAULT_MAX_LENGTH;
  return cleaned.length > cap ? cleaned.slice(0, cap) : cleaned;
}

/**
 * Validate strictly in code, loosely in schema. Returns a human-readable
 * problem or null. Descriptive enough that a model can self-correct.
 */
export function validateField(def: FieldDef, raw: string): string | null {
  const value = raw.trim();
  if (value === "") {
    return def.required ? `${def.label} is required.` : null;
  }
  switch (def.kind) {
    case "number": {
      if (!/^-?\d+(\.\d+)?$/.test(value)) {
        return `${def.label} must be a plain number, digits only (for example 1450 or 1450.50).`;
      }
      if (Number(value) < 0) return `${def.label} cannot be negative.`;
      return null;
    }
    case "date": {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return `${def.label} must be a date in YYYY-MM-DD form.`;
      }
      const d = new Date(value + "T00:00:00Z");
      if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
        return `${def.label} is not a real calendar date.`;
      }
      return null;
    }
    case "select": {
      const allowed = (def.options ?? []).map((o) => o.value);
      if (!allowed.includes(value)) {
        return `${def.label} must be one of: ${allowed.join(", ")}.`;
      }
      return null;
    }
    case "boolean": {
      if (value !== "true" && value !== "false") {
        return `${def.label} must be exactly "true" or "false".`;
      }
      return null;
    }
    case "text":
      return null;
  }
}
