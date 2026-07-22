import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  mixOver,
  WCAG_AA_NORMAL_TEXT,
  WCAG_AA_UI_COMPONENT,
} from "./contrast";

// Hex values copied verbatim from the `@theme` block in
// webapp/src/app/globals.css (Phase A1) — community affiliation colors.
// Chip backgrounds are a color-mix() tint of `raw` over white: 5% by
// default, 15% when `.selected`. Latin King uses a separate darker
// `text` color for legibility (the raw yellow is used only for the border).
const communities = [
  { name: "Crip", text: "#0000ff", raw: "#0000ff" },
  { name: "Blood", text: "#ff0000", raw: "#ff0000" },
  { name: "Latin King", text: "#b8860b", raw: "#ffd700" },
  { name: "Deceptacon", text: "#800080", raw: "#800080" },
  { name: "Independent / Neutral", text: "#4b5563", raw: "#4b5563" },
];

describe("affiliation chip text vs. AA large-text/UI-component threshold (3:1)", () => {
  it.each(communities)("$name text clears 3:1 against both the 5% and 15% tint background", ({ text, raw }) => {
    const bg5 = mixOver(raw, 5);
    const bg15 = mixOver(raw, 15);
    expect(contrastRatio(text, bg5)).toBeGreaterThanOrEqual(WCAG_AA_UI_COMPONENT);
    expect(contrastRatio(text, bg15)).toBeGreaterThanOrEqual(WCAG_AA_UI_COMPONENT);
  });
});

describe("affiliation chip text vs. AA normal-text threshold (4.5:1)", () => {
  // Crip, Deceptacon, and Neutral all comfortably clear 4.5:1 in every
  // tested context (measured >= 6.0 even at the 15% "selected" tint).
  it.each([
    communities[0], // Crip
    communities[3], // Deceptacon
    communities[4], // Independent / Neutral
  ])("$name text clears 4.5:1 against both the 5% and 15% tint background", ({ text, raw }) => {
    const bg5 = mixOver(raw, 5);
    const bg15 = mixOver(raw, 15);
    expect(contrastRatio(text, bg5)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    expect(contrastRatio(text, bg15)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
  });

  // Known shortfall: Blood Red (#FF0000) measures ~4.00:1 even against
  // plain white (never reaches 4.5:1), and Latin King's dark-goldenrod
  // text measures ~3.1-3.25:1. Both clear the 3:1 large-text/UI threshold
  // above but fall short of strict AA normal-text contrast at the chip's
  // small (10-12px) label size. Flagged here rather than silently
  // adjusted, since these are Phase A1 colors ported verbatim from the
  // mockups — narrowing them is a design call for a human to make.
  it("documents that Blood Red text does not reach 4.5:1 even on a plain white background", () => {
    const blood = communities[1];
    expect(contrastRatio(blood.text, "#ffffff")).toBeLessThan(WCAG_AA_NORMAL_TEXT);
    expect(contrastRatio(blood.text, "#ffffff")).toBeGreaterThanOrEqual(WCAG_AA_UI_COMPONENT);
  });

  it("documents that Latin King text does not reach 4.5:1 even on a plain white background", () => {
    const latinKing = communities[2];
    expect(contrastRatio(latinKing.text, "#ffffff")).toBeLessThan(WCAG_AA_NORMAL_TEXT);
    expect(contrastRatio(latinKing.text, "#ffffff")).toBeGreaterThanOrEqual(WCAG_AA_UI_COMPONENT);
  });
});

describe("affiliation chip border vs. AA UI-component threshold (3:1)", () => {
  it("Crip, Blood, Deceptacon, and Neutral borders clear 3:1 against white", () => {
    for (const community of [communities[0], communities[1], communities[3], communities[4]]) {
      expect(contrastRatio(community.raw, "#ffffff")).toBeGreaterThanOrEqual(WCAG_AA_UI_COMPONENT);
    }
  });

  // Known failure: the raw Latin King yellow (#FFD700) used for the chip
  // border measures ~1.40:1 against white — well under even the lenient
  // 3:1 UI-component threshold. The border's informational role is
  // secondary to the adjacent text/icon (which independently clears 3:1
  // above), but this is a real gap worth a design follow-up — e.g. a
  // darker gold border, or a thicker/higher-contrast outline.
  it("documents that the raw Latin King yellow border fails 3:1 against white", () => {
    const latinKing = communities[2];
    expect(contrastRatio(latinKing.raw, "#ffffff")).toBeLessThan(WCAG_AA_UI_COMPONENT);
  });
});
