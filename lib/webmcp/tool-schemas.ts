/**
 * Single source of truth for tool names and input schemas. The registration
 * manager registers from here; the eval validator checks fixtures against it.
 * Budgets (Chrome guidance): name ≤30 chars, description ≤500, param desc ≤150.
 */
export interface ToolSchema {
  description: string;
  readOnly: boolean;
  inputSchema: {
    type: "object";
    properties?: Record<string, { type: string; description?: string; enum?: string[] }>;
    required?: string[];
  };
}

export const TOOL_SCHEMAS: Record<string, ToolSchema> = {
  get_demo_status: {
    description:
      "Reports the preflight status of this WebMCP demo page: which checks passed and how many times an agent has called this tool. Read-only.",
    readOnly: true,
    inputSchema: { type: "object", properties: {} },
  },
};

export const NAME_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;
export const BUDGET = { name: 30, description: 500, paramDescription: 150, output: 1500 };
