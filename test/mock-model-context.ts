/**
 * Typed fake of the WebMCP `document.modelContext` surface for tests.
 *
 * Targets the published draft at https://webmachinelearning.github.io/webmcp/
 * as of 2026-09-01. It enforces the contracts that real code gets wrong:
 *
 *  1. `registerTool()` returns a Promise that REJECTS on a duplicate or empty
 *     name, empty description, non-function execute, or non-serializable
 *     inputSchema. Unawaited, that rejection means the tool silently does not
 *     exist in the real browser.
 *  2. `executeTool()` takes the arguments as a JSON STRING, not an object,
 *     and the tool's `execute` receives the parsed object.
 *  3. `execute` receives `{ signal }`; aborting fires the signal and dispatches
 *     BOTH `toolcancel` and `toolcanceled` on window (spec vs Chrome spelling).
 *  4. Unregistration (via AbortSignal passed to registerTool) is observable so
 *     lifecycle tests can assert there is no register/unregister churn.
 */

type Listener = (event: Event) => void;

export interface RecordedCall {
  name: string;
  input: Record<string, unknown>;
  result?: unknown;
  error?: unknown;
}

export class FakeModelContext
  extends EventTarget
  implements WebMcpModelContext
{
  readonly tools = new Map<string, WebMcpToolDefinition>();
  readonly calls: RecordedCall[] = [];
  readonly registrationAttempts: string[] = [];
  readonly unregistered: string[] = [];

  async registerTool(
    tool: WebMcpToolDefinition,
    options?: { signal?: AbortSignal; exposedTo?: string[] }
  ): Promise<void> {
    this.registrationAttempts.push(tool?.name ?? "<missing>");
    if (!tool || typeof tool.name !== "string" || tool.name.length === 0) {
      throw new TypeError("registerTool: name must be a non-empty string");
    }
    if (tool.name.length > 128 || !/^[A-Za-z0-9_.-]+$/.test(tool.name)) {
      throw new TypeError(
        `registerTool: name "${tool.name}" violates [A-Za-z0-9_.-]{1,128}`
      );
    }
    if (typeof tool.description !== "string" || tool.description.length === 0) {
      throw new TypeError("registerTool: description must be non-empty");
    }
    if (typeof tool.execute !== "function") {
      throw new TypeError("registerTool: execute must be a function");
    }
    if (tool.inputSchema !== undefined) {
      try {
        JSON.stringify(tool.inputSchema);
      } catch {
        throw new TypeError("registerTool: inputSchema is not serializable");
      }
    }
    if (this.tools.has(tool.name)) {
      throw new DOMException(
        `registerTool: a tool named "${tool.name}" is already registered`,
        "InvalidStateError"
      );
    }
    if (options?.signal?.aborted) {
      throw new DOMException(
        "registerTool: signal already aborted",
        "AbortError"
      );
    }
    this.tools.set(tool.name, tool);
    options?.signal?.addEventListener(
      "abort",
      () => {
        this.tools.delete(tool.name);
        this.unregistered.push(tool.name);
        this.dispatchEvent(new Event("toolchange"));
      },
      { once: true }
    );
    this.dispatchEvent(new Event("toolchange"));
  }

  async getTools(): Promise<WebMcpRegisteredTool[]> {
    return [...this.tools.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: JSON.stringify(t.inputSchema ?? { type: "object" }),
        origin: "http://localhost",
      }));
  }

  async executeTool(
    tool: WebMcpRegisteredTool,
    inputArguments: string,
    options?: { signal?: AbortSignal }
  ): Promise<unknown> {
    const def = this.tools.get(tool.name);
    if (!def) {
      throw new DOMException(
        `executeTool: no tool "${tool.name}"`,
        "NotFoundError"
      );
    }
    if (typeof inputArguments !== "string") {
      throw new TypeError(
        "executeTool: inputArguments must be a JSON string (spec issue #278)"
      );
    }
    let input: Record<string, unknown>;
    try {
      input = JSON.parse(inputArguments) as Record<string, unknown>;
    } catch {
      throw new DOMException(
        "executeTool: inputArguments is not valid JSON",
        "DataError"
      );
    }
    const controller = new AbortController();
    const forward = () => {
      controller.abort();
      window.dispatchEvent(
        Object.assign(new Event("toolcancel"), { toolName: tool.name })
      );
      window.dispatchEvent(
        Object.assign(new Event("toolcanceled"), { toolName: tool.name })
      );
    };
    options?.signal?.addEventListener("abort", forward, { once: true });
    const record: RecordedCall = { name: tool.name, input };
    this.calls.push(record);
    try {
      const result = await def.execute(input, { signal: controller.signal });
      record.result = result;
      return result;
    } catch (error) {
      record.error = error;
      throw error;
    } finally {
      options?.signal?.removeEventListener("abort", forward);
    }
  }
}

/**
 * Install a fake on `document.modelContext` for the duration of a test.
 * Returns the fake and a restore function; call restore in afterEach.
 */
export function installFakeModelContext(
  location: "document" | "navigator" | "none" = "document"
): { fake: FakeModelContext; restore: () => void } {
  const fake = new FakeModelContext();
  const docDescriptor = Object.getOwnPropertyDescriptor(
    document,
    "modelContext"
  );
  const navDescriptor = Object.getOwnPropertyDescriptor(
    navigator,
    "modelContext"
  );

  if (location === "document") {
    Object.defineProperty(document, "modelContext", {
      value: fake,
      configurable: true,
    });
  } else if (location === "navigator") {
    Object.defineProperty(navigator, "modelContext", {
      value: fake,
      configurable: true,
    });
  }

  return {
    fake,
    restore: () => {
      if (docDescriptor)
        Object.defineProperty(document, "modelContext", docDescriptor);
      else delete (document as { modelContext?: unknown }).modelContext;
      if (navDescriptor)
        Object.defineProperty(navigator, "modelContext", navDescriptor);
      else delete (navigator as { modelContext?: unknown }).modelContext;
    },
  };
}

export type { Listener };
