import { z } from "zod";

// Step 2 (Profile) of the registration flow — webapp/src/app/register/page.tsx
export const profileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be 30 characters or fewer")
    .regex(/^\S+$/, "Username cannot contain spaces"),
  email: z.string().email("Please enter a valid email address"),
});

export type ProfileFields = z.infer<typeof profileSchema>;
