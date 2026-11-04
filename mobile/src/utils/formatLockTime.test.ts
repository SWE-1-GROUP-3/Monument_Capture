import { expect, it } from "vitest";
import { formatLockTime } from "./formatLockTime";

it.each([
  [0, "00:00:00"], [1, "00:00:01"], [999, "00:00:01"], [1000, "00:00:01"],
  [1001, "00:00:02"], [59_001, "00:01:00"], [60_000, "00:01:00"],
  [3_599_001, "01:00:00"], [10_800_000, "03:00:00"],
])("formats %i ms as %s", (remainingMs, expected) => {
  expect(formatLockTime(remainingMs)).toBe(expected);
});
