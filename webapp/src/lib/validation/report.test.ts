import { describe, expect, it } from "vitest";
import { CATEGORY_VALUES, reportSchema } from "./report";

const validDetails = "There was a direct threat made against another member in the forum.";

describe("reportSchema (/safety report form)", () => {
  it("accepts a valid report with an optional target omitted", () => {
    const result = reportSchema.safeParse({ category: "threat", details: validDetails });
    expect(result.success).toBe(true);
  });

  it("accepts a valid report with a target included", () => {
    const result = reportSchema.safeParse({
      category: "harassment",
      target: "@some_user",
      details: validDetails,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid category", () => {
    const result = reportSchema.safeParse({ category: "not_a_real_category", details: validDetails });
    expect(result.success).toBe(false);
  });

  it("rejects a missing category", () => {
    const result = reportSchema.safeParse({ details: validDetails });
    expect(result.success).toBe(false);
  });

  it("rejects details shorter than 10 characters", () => {
    const result = reportSchema.safeParse({ category: "harassment", details: "too short" });
    expect(result.success).toBe(false);
  });

  it("rejects details longer than 2000 characters", () => {
    const result = reportSchema.safeParse({ category: "threat", details: "a".repeat(2001) });
    expect(result.success).toBe(false);
  });

  it("rejects a target longer than 120 characters", () => {
    const result = reportSchema.safeParse({
      category: "impersonation",
      target: "a".repeat(121),
      details: validDetails,
    });
    expect(result.success).toBe(false);
  });

  it("trims whitespace-only details down to nothing and rejects it", () => {
    const result = reportSchema.safeParse({ category: "doxxing", details: "          " });
    expect(result.success).toBe(false);
  });

  it("exposes every category the /safety form's UI renders a radio pill for", () => {
    expect(CATEGORY_VALUES).toEqual([
      "threat",
      "hate_speech",
      "doxxing",
      "impersonation",
      "harassment",
      "recruitment",
    ]);
  });
});
