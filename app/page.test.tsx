import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { afterEach, describe, expect, it } from "vitest";
import HomePage from "./page";
import { ClaimForm } from "./components/claim-form";
import { COPY, FIELD_STATE_LABEL } from "@/lib/claim/copy";
import { ClaimProvider } from "@/lib/react/claim-context";
import {
  FakeModelContext,
  installFakeModelContext,
} from "../test/mock-model-context";

let restore: (() => void) | undefined;
afterEach(() => {
  restore?.();
  restore = undefined;
  sessionStorage.clear();
});

async function withAgent() {
  const installed = installFakeModelContext("document");
  restore = installed.restore;
  render(<HomePage />);
  await waitFor(() =>
    expect(
      screen.getByRole("status", { name: "Agent tools status" })
    ).toHaveTextContent(/7 agent tools registered/)
  );
  return installed.fake;
}

async function agentCall(fake: FakeModelContext, name: string, input: object) {
  const tool = (await fake.getTools()).find((t) => t.name === name)!;
  return JSON.parse(
    String(await fake.executeTool(tool, JSON.stringify(input)))
  );
}

describe("Hold the Pen page", () => {
  it("without WebMCP: shows the activation steps and stays usable by hand", async () => {
    render(<HomePage />);
    await waitFor(() =>
      expect(screen.getByText(/Agent tools unavailable/)).toBeInTheDocument()
    );
    expect(
      screen.getAllByText(/chrome:\/\/flags\/#enable-webmcp-testing/).length
    ).toBeGreaterThan(0);
    const name = screen.getByLabelText(/Full legal name/);
    await userEvent.type(name, "Ada King");
    expect(screen.getByText(FIELD_STATE_LABEL.human)).toBeInTheDocument();
  });

  it("registers exactly the seven tools once (StrictMode-safe)", async () => {
    const fake = await withAgent();
    expect([...fake.tools.keys()].sort()).toEqual([
      "clear_field",
      "explain",
      "fill_field",
      "get_claim_state",
      "navigate_to_section",
      "prepare_submission_review",
      "review_agent_entries",
    ]);
    expect(fake.registrationAttempts.length).toBe(7);
    expect(fake.unregistered).toEqual([]);
  });

  it("an agent fill shows the unreviewed badge, lands in the queue, announces without the value, and Accept resolves it", async () => {
    const fake = await withAgent();
    const r = await agentCall(fake, "fill_field", {
      field_id: "household_size",
      value: "2",
    });
    expect(r.ok).toBe(true);
    const field = document.querySelector('[data-field="household_size"]')!;
    await waitFor(() =>
      expect(
        within(field as HTMLElement).getByText(
          FIELD_STATE_LABEL.agentUnreviewed
        )
      ).toBeInTheDocument()
    );
    const queue = screen.getByRole("complementary", {
      name: /Review what the agent filled/,
    });
    expect(
      within(queue).getByText(/1 entry needs your review/)
    ).toBeInTheDocument();

    // Announcement names the field, never the value.
    await waitFor(() => {
      const live = document.querySelector(".sr-only[aria-live]")!;
      expect(live.textContent).toMatch(/How many people live/);
      expect(live.textContent).not.toMatch(/\b2\b/);
    });

    await userEvent.click(
      within(queue).getByRole("button", { name: "Accept" })
    );
    expect(
      within(field as HTMLElement).getByText(FIELD_STATE_LABEL.agentReviewed)
    ).toBeInTheDocument();
    expect(
      within(queue).getByText(/Nothing from the agent to review/)
    ).toBeInTheDocument();
  });

  it("an agent cannot overwrite what the person typed", async () => {
    const fake = await withAgent();
    await userEvent.type(screen.getByLabelText(/Full legal name/), "Ada King");
    // While the person is still in the field, the focus guard fires first.
    const whileEditing = await agentCall(fake, "fill_field", {
      field_id: "full_name",
      value: "Bob",
    });
    expect(whileEditing.error.code).toBe("CONFLICT_FOCUSED");
    await userEvent.tab();
    const r = await agentCall(fake, "fill_field", {
      field_id: "full_name",
      value: "Bob",
    });
    expect(r.ok).toBe(false);
    expect(r.error.code).toBe("CONFLICT_HUMAN_VALUE");
    expect(screen.getByLabelText(/Full legal name/)).toHaveValue("Ada King");
  });

  it("submit stays disabled until every agent entry is reviewed and the declaration is ticked", async () => {
    const fake = await withAgent();
    const answers: Record<string, string> = {
      full_name: "Ada King",
      date_of_birth: "1990-12-10",
      household_size: "2",
      employment_status: "employed",
      income_received_last_month: "1450",
      has_disability: "false",
      is_carer: "false",
    };
    for (const [id, value] of Object.entries(answers)) {
      expect(
        (await agentCall(fake, "fill_field", { field_id: id, value })).ok
      ).toBe(true);
    }
    const staged = await agentCall(fake, "prepare_submission_review", {});
    expect(staged.submitted).toBe(false);

    await agentCall(fake, "navigate_to_section", { section: "declaration" });
    const submit = await screen.findByRole("button", {
      name: /Submit my claim/,
    });
    expect(submit).toBeDisabled();
    expect(
      screen.getByText(/7 agent-filled entries have not been reviewed/)
    ).toBeInTheDocument();

    // The person accepts every entry (this invalidates the stage, by design).
    const queue = screen.getByRole("complementary", {
      name: /Review what the agent filled/,
    });
    for (let i = 0; i < 7; i++) {
      await userEvent.click(
        within(queue).getAllByRole("button", { name: "Accept" })[0]
      );
    }
    expect(submit).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /prepare again/i })
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /prepare again/i })
    );
    expect(submit).toBeDisabled(); // declaration not ticked
    await userEvent.click(screen.getByRole("checkbox"));
    expect(submit).toBeEnabled();
    await userEvent.click(submit);
    expect(
      await screen.findByRole("heading", { name: /Claim submitted/ })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/WC-\d{4}-/).length).toBeGreaterThan(0);
  });

  it("the review queue toggles between a collapsed bar and an open sheet", async () => {
    await withAgent();
    const queue = screen.getByRole("complementary", {
      name: /Review what the agent filled/,
    });
    const toggle = within(queue).getByRole("button", {
      name: /Show agent entries/,
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(queue).toHaveAttribute("data-open", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAccessibleName(/Hide agent entries/);
    expect(queue).toHaveAttribute("data-open", "true");
    await userEvent.click(toggle);
    expect(queue).toHaveAttribute("data-open", "false");
  });

  it("Correct closes the sheet and moves focus to the field", async () => {
    const fake = await withAgent();
    await agentCall(fake, "fill_field", {
      field_id: "household_size",
      value: "2",
    });
    const queue = screen.getByRole("complementary", {
      name: /Review what the agent filled/,
    });
    await userEvent.click(
      within(queue).getByRole("button", { name: /Show agent entries/ })
    );
    expect(queue).toHaveAttribute("data-open", "true");
    await userEvent.click(
      within(queue).getByRole("button", { name: "Correct" })
    );
    expect(queue).toHaveAttribute("data-open", "false");
    await waitFor(() =>
      expect(screen.getByLabelText(/How many people live/)).toHaveFocus()
    );
  });

  it("empties the live region after the announcement has been held", async () => {
    const installed = installFakeModelContext("document");
    restore = installed.restore;
    render(
      <ClaimProvider announceHoldMs={60}>
        <ClaimForm />
      </ClaimProvider>
    );
    await waitFor(() =>
      expect(
        screen.getByRole("status", { name: "Agent tools status" })
      ).toHaveTextContent(/7 agent tools registered/)
    );
    await agentCall(installed.fake, "fill_field", {
      field_id: "household_size",
      value: "2",
    });
    const live = document.querySelector(".sr-only[aria-live]")!;
    await waitFor(() =>
      expect(live.textContent).toMatch(/How many people live/)
    );
    await waitFor(() => expect(live.textContent).toBe(""));
  });

  it("moves focus to the declaration heading when that section opens", async () => {
    render(<HomePage />);
    await userEvent.click(
      screen.getByRole("button", { name: /Check and declare/ })
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 2, name: COPY.approval.heading })
      ).toHaveFocus()
    );
  });

  it("leaves focus alone on first render and moves it only on navigation", async () => {
    render(<HomePage />);
    await waitFor(() =>
      expect(screen.getByText(/Agent tools unavailable/)).toBeInTheDocument()
    );
    expect(document.body).toHaveFocus();
    await userEvent.click(
      screen.getByRole("button", { name: /2\. Money coming in/ })
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 2, name: "Money coming in" })
      ).toHaveFocus()
    );
  });

  it("has no axe violations on the form and the declaration page", async () => {
    const fake = await withAgent();
    expect(await axe(document.body)).toHaveNoViolations();
    await agentCall(fake, "navigate_to_section", { section: "declaration" });
    await screen.findByRole("heading", { name: /Check and declare/ });
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
