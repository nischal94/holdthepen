"use client";

import { useEffect, useState } from "react";
import {
  describeModelContextLocation,
  getModelContext,
} from "@/lib/webmcp/get-model-context";
import { TOOL_SCHEMAS } from "@/lib/webmcp/tool-schemas";

type CheckStatus = "pending" | "pass" | "fail";

interface PreflightState {
  originIsolated: CheckStatus;
  apiPresent: CheckStatus;
  apiLocation: string;
  registration: CheckStatus;
  registrationError: string;
  toolCount: number | null;
  toolNames: string[];
  demoCallCount: number;
}

const FLAG_URL = "chrome://flags/#enable-webmcp-testing";

export default function PreflightPage() {
  const [state, setState] = useState<PreflightState>({
    originIsolated: "pending",
    apiPresent: "pending",
    apiLocation: "—",
    registration: "pending",
    registrationError: "",
    toolCount: null,
    toolNames: [],
    demoCallCount: 0,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function runPreflight() {
      const originIsolated: CheckStatus = window.originAgentCluster
        ? "pass"
        : "fail";

      const mc = getModelContext();
      const apiLocation = describeModelContextLocation();

      if (!mc) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            originIsolated,
            apiPresent: "fail",
            apiLocation,
            registration: "fail",
            registrationError: "API absent — nothing to register against.",
          }));
        }
        return;
      }

      let registration: CheckStatus = "pending";
      let registrationError = "";
      try {
        // Await the registration promise: it REJECTS on duplicate/empty name
        // or a bad schema, and an unawaited rejection means the tool silently
        // does not exist.
        const schema = TOOL_SCHEMAS.get_demo_status;
        await mc.registerTool({
          name: "get_demo_status",
          description: schema.description,
          inputSchema: schema.inputSchema,
          annotations: { readOnlyHint: schema.readOnly, untrustedContentHint: false },
          execute: async () => {
            setState((s) => ({ ...s, demoCallCount: s.demoCallCount + 1 }));
            return "Preflight OK. WebMCP tool execution works on this page. This is a deploy-verification build of Hold the Pen; the full claim form is under construction.";
          },
        });
        registration = "pass";
      } catch (err) {
        registration = "fail";
        registrationError = err instanceof Error ? err.message : String(err);
      }

      let toolNames: string[] = [];
      try {
        const tools = await mc.getTools();
        toolNames = tools.map((t) => t.name);
      } catch {
        // getTools failure is reported via toolCount staying null
      }

      if (!cancelled) {
        setState((s) => ({
          ...s,
          originIsolated,
          apiPresent: "pass",
          apiLocation,
          registration,
          registrationError,
          toolCount: toolNames.length,
          toolNames,
        }));
      }
    }

    runPreflight();
    return () => {
      cancelled = true;
    };
  }, []);

  const allPass =
    state.originIsolated === "pass" &&
    state.apiPresent === "pass" &&
    state.registration === "pass";

  async function copyFlag() {
    try {
      await navigator.clipboard.writeText(FLAG_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may be unavailable; the string is visible to copy by hand
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
        Hold the Pen · deploy verification
      </p>
      <h1 className="mt-2 text-3xl font-semibold">WebMCP preflight</h1>

      <div
        role="status"
        className={`mt-6 rounded-lg border px-4 py-3 text-base font-medium ${
          allPass
            ? "border-green-300 bg-green-50 text-green-900"
            : "border-amber-300 bg-amber-50 text-amber-900"
        }`}
      >
        {allPass
          ? `✅ WebMCP is live on this page — ${state.toolCount ?? 0} tool registered.`
          : "⚠️ WebMCP is not active in this browser yet. Follow the steps below."}
      </div>

      <table className="mt-8 w-full border-collapse text-left">
        <caption className="sr-only">Preflight checks</caption>
        <thead>
          <tr className="border-b border-neutral-300 text-sm text-neutral-500">
            <th className="py-2 pr-4 font-medium">Check</th>
            <th className="py-2 font-medium">Result</th>
          </tr>
        </thead>
        <tbody className="text-[15px]">
          <Row
            label="Origin isolation (window.originAgentCluster)"
            status={state.originIsolated}
            detail={
              state.originIsolated === "fail"
                ? "Server must not send Origin-Agent-Cluster: ?0"
                : "Origin-isolated document"
            }
          />
          <Row
            label="WebMCP API present"
            status={state.apiPresent}
            detail={state.apiLocation}
          />
          <Row
            label="Tool registration (awaited)"
            status={state.registration}
            detail={
              state.registration === "fail"
                ? state.registrationError
                : "get_demo_status registered"
            }
          />
          <tr className="border-b border-neutral-200">
            <td className="py-2 pr-4">Registered tools (getTools)</td>
            <td className="py-2 font-mono text-sm">
              {state.toolCount === null
                ? "—"
                : state.toolNames.join(", ") || "none"}
            </td>
          </tr>
          <tr className="border-b border-neutral-200">
            <td className="py-2 pr-4">Agent calls this session</td>
            <td className="py-2 font-mono text-sm">{state.demoCallCount}</td>
          </tr>
        </tbody>
      </table>

      <section className="mt-10" aria-labelledby="setup-heading">
        <h2 id="setup-heading" className="text-xl font-semibold">
          Enable WebMCP
        </h2>
        <ol className="mt-3 list-decimal space-y-3 pl-5 text-[15px]">
          <li>
            <span className="font-medium">Chrome 149 or later:</span> open{" "}
            <code className="rounded bg-neutral-200 px-1.5 py-0.5 text-sm">
              {FLAG_URL}
            </code>{" "}
            <button
              onClick={copyFlag}
              className="ml-1 rounded border border-neutral-400 px-2 py-0.5 text-sm hover:bg-neutral-200"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
            , set it to <strong>Enabled</strong>, and relaunch Chrome (Chrome
            will restart).
          </li>
          <li>
            <span className="font-medium">Or use the ChatGPT desktop app:</span>{" "}
            its in-app browser supports WebMCP by default (GPT-5.6 Sol/Terra;
            Luna has site tools disabled). Open this URL there and click
            “Site tools” in the address bar.
          </li>
          <li>
            Return here — the status above turns green automatically. Then ask
            your agent:{" "}
            <code className="rounded bg-neutral-200 px-1.5 py-0.5 text-sm">
              What does the demo status tool on this page say?
            </code>
          </li>
        </ol>
      </section>

      <p className="mt-10 border-t border-neutral-300 pt-4 text-sm text-neutral-500">
        This page is the day-one deploy verification for Hold the Pen — an
        agent fills the form, you hold the pen. Built for the WebMCP Challenge.
        The claim form arrives next.
      </p>
    </main>
  );
}

function Row({
  label,
  status,
  detail,
}: {
  label: string;
  status: CheckStatus;
  detail: string;
}) {
  const icon =
    status === "pass" ? "✅ Pass" : status === "fail" ? "❌ Fail" : "… Checking";
  return (
    <tr className="border-b border-neutral-200 align-top">
      <td className="py-2 pr-4">{label}</td>
      <td className="py-2">
        <span className="font-medium">{icon}</span>
        <span className="block text-sm text-neutral-500">{detail}</span>
      </td>
    </tr>
  );
}
