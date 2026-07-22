import { z } from "zod";

// Public "Contact Us" form — webapp/src/app/(marketing)/contact/page.tsx
export const contactSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100, "Keep this under 100 characters"),
  email: z.string().trim().email("Please enter a valid email address"),
  message: z
    .string()
    .trim()
    .min(10, "Please provide at least 10 characters")
    .max(2000, "Keep this under 2000 characters"),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
