/**
 * Resolve the WebMCP entry point defensively.
 *
 * The getter moved from `navigator.modelContext` to `document.modelContext`
 * (spec change ~2026-05-27). Chrome 150 deprecated the old name but keeps it
 * as a working alias, to be removed later. Most tutorials still show the old
 * location. Prefer the current location, fall back to the alias, and never
 * touch either during server rendering.
 */
export type ModelContextLocation =
  | "document.modelContext"
  | "navigator.modelContext (deprecated alias)"
  | "absent";

export function getModelContext(): WebMcpModelContext | undefined {
  if (typeof document === "undefined") return undefined;
  return document.modelContext ?? navigator.modelContext;
}

export function describeModelContextLocation(): ModelContextLocation {
  if (typeof document === "undefined") return "absent";
  if (document.modelContext) return "document.modelContext";
  if (navigator.modelContext) return "navigator.modelContext (deprecated alias)";
  return "absent";
}
