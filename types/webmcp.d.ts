// Minimal ambient types for the experimental WebMCP API (document.modelContext).
// Spec: https://webmachinelearning.github.io/webmcp/
// Kept local and minimal for the preflight; the full app may adopt the
// `webmcp-types` package later.

interface WebMcpToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
}

interface WebMcpToolDefinition {
  name: string;
  title?: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  annotations?: WebMcpToolAnnotations;
  execute: (
    input: Record<string, unknown>,
    options?: { signal?: AbortSignal }
  ) => unknown | Promise<unknown>;
}

interface WebMcpRegisteredTool {
  name: string;
  description: string;
  inputSchema: unknown;
  origin?: string;
}

interface WebMcpModelContext extends EventTarget {
  registerTool(
    tool: WebMcpToolDefinition,
    options?: { signal?: AbortSignal; exposedTo?: string[] }
  ): Promise<void>;
  getTools(options?: {
    fromOrigins?: string[];
  }): Promise<WebMcpRegisteredTool[]>;
  executeTool(
    tool: WebMcpRegisteredTool,
    inputArguments: string,
    options?: { signal?: AbortSignal }
  ): Promise<unknown>;
}

interface Document {
  modelContext?: WebMcpModelContext;
}

interface Navigator {
  /** Deprecated alias of document.modelContext (Chrome 150+). */
  modelContext?: WebMcpModelContext;
}

interface Window {
  originAgentCluster?: boolean;
}
