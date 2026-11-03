import { describe, expect, it } from "vitest";
import { mapMonuments } from "../data/mapMonuments";
import { getValidMonuments, isValidCoordinate } from "./mapData";

describe("map data validation", () => {
  it.each([undefined, null, {}, []])("handles empty or missing data: %s", (data) => {
    expect(getValidMonuments(data)).toEqual([]);
  });
  it("preserves all valid mock monuments", () => {
    expect(getValidMonuments(mapMonuments)).toEqual(mapMonuments);
  });
  it("ignores malformed records and duplicate IDs while keeping valid markers", () => {
    const valid = mapMonuments[0]!;
    expect(getValidMonuments([
      null, undefined, {}, valid, valid,
      { ...valid, id: "nan", latitude: NaN },
      { ...valid, id: "infinity", longitude: Infinity },
      { ...valid, id: "latitude", latitude: 91 },
      { ...valid, id: "longitude", longitude: -181 },
      { ...valid, id: "string", latitude: "40" },
      { ...valid, id: "missing", latitude: undefined },
      { ...valid, id: "" }, { ...valid, id: "name", name: " " },
    ])).toEqual([valid]);
  });
  it("accepts valid boundary and zero coordinates", () => {
    expect(isValidCoordinate({ latitude: 0, longitude: 0 })).toBe(true);
    expect(isValidCoordinate({ latitude: -90, longitude: 180 })).toBe(true);
  });
});
