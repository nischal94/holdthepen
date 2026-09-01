import { render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { afterEach, describe, expect, it } from "vitest";
import PreflightPage from "./page";
import { installFakeModelContext } from "../test/mock-model-context";

describe("Preflight page", () => {
  let restore: (() => void) | undefined;
  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it("degrades honestly when WebMCP is absent: instructions, not a blank page", async () => {
    render(<PreflightPage />);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/not active/i)
    );
    expect(
      screen.getByText(/chrome:\/\/flags\/#enable-webmcp-testing/)
    ).toBeVisible();
    expect(screen.getByText(/API absent/i)).toBeInTheDocument();
  });

  it("registers exactly one tool when the API exists and reports it green", async () => {
    const installed = installFakeModelContext("document");
    // The banner turns green only with origin isolation AND a working API,
    // the same two runtime facts the deployed preflight asserts. jsdom has
    // neither by default, so simulate isolation here.
    Object.defineProperty(window, "originAgentCluster", {
      value: true,
      configurable: true,
    });
    restore = () => {
      installed.restore();
      delete (window as { originAgentCluster?: boolean }).originAgentCluster;
    };
    render(<PreflightPage />);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/1 tool registered/)
    );
    expect(installed.fake.registrationAttempts).toEqual(["get_demo_status"]);
    expect([...installed.fake.tools.keys()]).toEqual(["get_demo_status"]);
    expect(installed.fake.unregistered).toEqual([]);
  });

  it("has no axe-detectable accessibility violations in the degraded state", async () => {
    const { container } = render(<PreflightPage />);
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
    expect(await axe(container)).toHaveNoViolations();
  });
});
