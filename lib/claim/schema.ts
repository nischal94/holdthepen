import type { ClaimSchema, FieldDef, FieldId } from "./types";

/**
 * Wendell County Household Support Allowance, a fictional programme. Question
 * wording and the confusion points are modelled on real UK benefit forms
 * (income *received* vs *earned*, capital thresholds, carer hours); the
 * rules are simulated. Content is data: sections can be cut without
 * touching store or tool code.
 */
export const CLAIM_SCHEMA: ClaimSchema = {
  sections: [
    {
      id: "household",
      title: "About you and your household",
      purpose: "Who is claiming and who lives with you.",
    },
    {
      id: "income",
      title: "Money coming in",
      purpose: "What you received last month, not what you were owed.",
    },
    {
      id: "caring",
      title: "Disability and caring",
      purpose: "Conditions or caring responsibilities that change your award.",
    },
    {
      id: "declaration",
      title: "Check and declare",
      purpose: "Review every answer, then confirm the claim is true.",
    },
  ],
  fields: [
    {
      id: "full_name",
      section: "household",
      label: "Full legal name",
      kind: "text",
      required: true,
      maxLength: 120,
      explain: {
        meaning:
          "Your name exactly as it appears on official identity documents.",
        consequences:
          "A mismatch with identity records delays the claim; it does not change the award.",
      },
    },
    {
      id: "date_of_birth",
      section: "household",
      label: "Date of birth",
      kind: "date",
      required: true,
      explain: {
        meaning: "The date you were born, as YYYY-MM-DD.",
        consequences: "Age sets which allowance rates apply to you.",
      },
    },
    {
      id: "household_size",
      section: "household",
      label: "How many people live in your household, including you?",
      kind: "number",
      required: true,
      explain: {
        meaning:
          "Everyone who normally lives at your address and shares meals or bills, not lodgers who pay rent.",
        term: "Household: people living with you as one unit, not just people at the same address.",
        consequences:
          "A larger household raises the allowance ceiling. Counting a lodger as household can be treated as a false statement.",
      },
    },
    {
      id: "employment_status",
      section: "income",
      label: "Your current employment status",
      kind: "select",
      required: true,
      options: [
        { value: "employed", label: "Employed" },
        { value: "self_employed", label: "Self-employed" },
        { value: "not_working", label: "Not working" },
      ],
      explain: {
        meaning: "How you earn money right now, if at all.",
        consequences:
          "Self-employed claimants report earnings differently and may be asked for accounts.",
      },
    },
    {
      id: "income_received_last_month",
      section: "income",
      label: "Money you RECEIVED last month, before tax",
      kind: "number",
      required: true,
      explain: {
        meaning:
          "Money that actually arrived in your account or hand last month. Not money you were owed but had not yet been paid.",
        term: "Received means paid to you during the month, even if it was earned earlier.",
        consequences:
          "The allowance is reduced by a share of money received. If your last pay arrived late, the truthful figure here is lower than what you earned, and the award for this month is higher. Do not include money still owed to you.",
      },
    },
    {
      id: "income_owed_not_received",
      section: "income",
      label: "Money you earned last month but have NOT yet received",
      kind: "number",
      required: false,
      explain: {
        meaning:
          "Pay or invoices for last month's work that had not arrived by the end of the month.",
        consequences:
          "Not counted this month. It counts in the month it arrives, so keep the record to avoid a later overpayment notice.",
      },
    },
    {
      id: "has_disability",
      section: "caring",
      label: "Do you have a long-term health condition or disability?",
      kind: "boolean",
      required: true,
      explain: {
        meaning:
          "A physical or mental condition lasting, or expected to last, 12 months or more.",
        consequences:
          "A qualifying condition adds a supplement to the allowance.",
      },
    },
    {
      id: "is_carer",
      section: "caring",
      label: "Do you care for someone for 35 hours a week or more?",
      kind: "boolean",
      required: true,
      explain: {
        meaning:
          "Regular unpaid care for a person with a disability or long-term condition, adding up to 35 hours or more each week.",
        term: "Caring includes supervision, help with daily tasks, and time spent arranging care.",
        consequences:
          "35 hours or more qualifies for the carer element. Hours below 35 do not qualify; do not round up.",
      },
    },
    {
      id: "carer_hours",
      section: "caring",
      label: "Roughly how many hours a week do you spend caring?",
      kind: "number",
      required: true,
      dependsOn: { field: "is_carer", equals: "true" },
      explain: {
        meaning: "Your honest weekly estimate of caring hours.",
        consequences:
          "Used to confirm the carer element. An estimate well above reality can be treated as a false statement.",
      },
    },
  ],
};

export const FIELD_BY_ID: Record<FieldId, FieldDef> = Object.fromEntries(
  CLAIM_SCHEMA.fields.map((f) => [f.id, f])
);

export const FIELD_ORDER: FieldId[] = CLAIM_SCHEMA.fields.map((f) => f.id);

export const COMMITMENTS = [
  "The information given is correct and complete to the best of my knowledge.",
  "I will report any change in my income, household, or caring responsibilities.",
  "I understand that a false statement can lead to the claim being refused and money being reclaimed.",
];
