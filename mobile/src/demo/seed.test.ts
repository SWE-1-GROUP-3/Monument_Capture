import { describe, expect, it } from "vitest";

import { createSeedState } from "./seed";

describe("initial local state", () => {
  it("starts with app monuments and no fabricated player activity", () => {
    const state = createSeedState(Date.now());

    expect(state.users).toHaveLength(4);
    expect(state.monuments).toHaveLength(15);
    expect(state.captures).toEqual([]);
    expect(state.reviews).toEqual([]);
    expect(state.monuments.map((monument) => monument.id)).not.toContain("6mtc-class");
    expect(state.monuments.map((monument) => monument.id)).not.toContain("test-location-1");
  });
});
