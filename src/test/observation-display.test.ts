import { describe, expect, it } from "vitest";
import { observationDisplay } from "../lib/observation-display";

describe("observation availability", () => {
  it("never presents a zero while services are loading", () => {
    expect(observationDisplay(0, true, "")).toBeNull();
  });
  it("distinguishes unavailable measurements from zero records", () => {
    expect(observationDisplay(0, false, "Request failed")).toBe("Unavailable");
  });
  it("shows a genuine zero only after a successful response", () => {
    expect(observationDisplay(0, false, "")).toBe("0");
  });
});