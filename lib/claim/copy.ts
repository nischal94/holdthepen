/**
 * Every user-facing string in one place, written at design time rather than
 * improvised in components. Field-state labels are text so they work without
 * colour or sight of an outline.
 */
export const FIELD_STATE_LABEL = {
  empty: "Not answered yet",
  human: "Entered by you",
  agentUnreviewed: "Filled by the agent, not yet reviewed",
  agentReviewed: "Filled by the agent, reviewed by you",
  corrected: "Corrected by you",
  invalid: "Needs a fix",
} as const;

export const COPY = {
  productName: "Hold the Pen",
  tagline: "An agent can fill the form. You hold the pen.",
  claimTitle: "Wendell County Household Support Allowance",
  claimPurpose:
    "This claim decides whether you receive a monthly allowance and how much. An agent can explain and fill it for you. Nothing is sent until you approve it.",
  storageNote:
    "Your answers stay in this browser tab. Use “Save draft on this device” to keep them for this session only.",

  status: {
    ready: (n: number) => `${n} agent tools registered`,
    registering: "Registering agent tools…",
    unsupported: "Agent tools unavailable in this browser",
    degraded: (ok: number, failed: number) =>
      `${ok} agent tools registered, ${failed} failed`,
  },

  kit: {
    heading: "Try it with an agent",
    step1:
      "Chrome 149 or later: open the flag below, set it to Enabled, relaunch Chrome.",
    step2:
      "Or open this page in the ChatGPT desktop app’s browser and choose “Site tools” in the address bar.",
    step3:
      "Come back here. When the status above turns green, ask your agent one of these:",
    flag: "chrome://flags/#enable-webmcp-testing",
    prompts: [
      "Explain the income question on this form before I answer it.",
      "Fill in the household section for me: I'm Ada King, born 1990-12-10, two of us at home.",
      "Everything is filled in. Get it ready for me to check.",
    ],
    copy: "Copy",
    copied: "Copied",
  },

  queue: {
    heading: "Review what the agent filled",
    empty: "Nothing from the agent to review.",
    count: (n: number) =>
      n === 1 ? "1 entry needs your review" : `${n} entries need your review`,
    accept: "Accept",
    correct: "Correct",
    clear: "Clear",
    show: "Show agent entries",
    hide: "Hide agent entries",
    showShort: "Show",
    hideShort: "Hide",
  },

  announce: {
    agentFilled: (labels: string[]) =>
      labels.length === 1
        ? `The agent filled “${labels[0]}”. It needs your review.`
        : `The agent filled ${labels.length} fields: ${labels.join(", ")}. They need your review.`,
    cleared: (label: string) => `“${label}” was cleared.`,
    accepted: (label: string) => `“${label}” accepted.`,
    staged: "A review of your answers is ready. Check each one, then approve.",
    invalidated:
      "Your answers changed after the review was prepared. Prepare it again before approving.",
    approved: (ref: string) => `Claim submitted. Your reference is ${ref}.`,
  },

  approval: {
    heading: "Check and declare",
    intro:
      "Read every answer below. Anything the agent filled is marked and must be accepted or corrected before you can submit.",
    prepare: "Prepare my answers for review",
    reprepare: "Answers changed. Prepare again",
    declaration:
      "I have reviewed these answers and confirm they are true and complete.",
    submit: "Submit my claim",
    blockedUnreviewed: (n: number) =>
      `Submit is disabled: ${n} agent-filled ${n === 1 ? "entry has" : "entries have"} not been reviewed.`,
    blockedDeclaration: "Submit is disabled until you tick the declaration.",
    blockedStage: "Prepare your answers for review first.",
    done: "Claim submitted",
    reference: "Your reference",
  },

  actions: {
    saveDraft: "Save draft on this device",
    clearData: "Clear claim data",
    savedDraft: "Draft saved for this session.",
    clearedData: "All claim data cleared.",
  },
} as const;
