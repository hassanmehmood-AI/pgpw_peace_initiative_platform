import { z } from "zod";

// Violation categories for the /safety report form — webapp/src/app/(app)/safety/page.tsx
export const CATEGORY_VALUES = [
  "threat",
  "hate_speech",
  "doxxing",
  "impersonation",
  "harassment",
  "recruitment",
] as const;

export const CATEGORY_LABELS: Record<(typeof CATEGORY_VALUES)[number], string> = {
  threat: "Threat",
  hate_speech: "Hate Speech",
  doxxing: "Doxxing",
  impersonation: "Impersonation",
  harassment: "Harassment",
  recruitment: "Recruitment",
};

export const reportSchema = z.object({
  category: z.enum(CATEGORY_VALUES, { message: "Select a violation category" }),
  target: z.string().trim().max(120, "Keep this under 120 characters").optional(),
  details: z
    .string()
    .trim()
    .min(10, "Please provide at least 10 characters of detail")
    .max(2000, "Keep this under 2000 characters"),
});

export type ReportFormValues = z.infer<typeof reportSchema>;
