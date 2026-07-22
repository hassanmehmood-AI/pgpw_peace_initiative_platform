import { describe, expect, it } from "vitest";
import { profileSchema } from "./registration";

describe("profileSchema (registration Step 2)", () => {
  it("accepts a valid username + email", () => {
    const result = profileSchema.safeParse({ username: "peacebuilder_42", email: "name@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects a username shorter than 3 characters", () => {
    const result = profileSchema.safeParse({ username: "ab", email: "name@example.com" });
    expect(result.success).toBe(false);
  });

  it("rejects a username longer than 30 characters", () => {
    const result = profileSchema.safeParse({
      username: "a".repeat(31),
      email: "name@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a username containing spaces", () => {
    const result = profileSchema.safeParse({ username: "peace builder", email: "name@example.com" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email address", () => {
    const result = profileSchema.safeParse({ username: "peacebuilder", email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing email", () => {
    const result = profileSchema.safeParse({ username: "peacebuilder" });
    expect(result.success).toBe(false);
  });

  it("accepts a username at the exact 3-character boundary", () => {
    const result = profileSchema.safeParse({ username: "abc", email: "name@example.com" });
    expect(result.success).toBe(true);
  });

  it("accepts a username at the exact 30-character boundary", () => {
    const result = profileSchema.safeParse({
      username: "a".repeat(30),
      email: "name@example.com",
    });
    expect(result.success).toBe(true);
  });
});
