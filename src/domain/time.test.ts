import { describe, expect, it } from "vitest";
import { buildRfc3339, parseOffset, resolveZoned, toUtcIso } from "./time";

describe("offsets", () => {
  it("valida limites", () => {
    expect(parseOffset("-03:00")).toBe(-180);
    expect(parseOffset("+05:45")).toBe(345);
    expect(parseOffset("Z")).toBe(0);
    expect(parseOffset("+14:00")).toBe(840);
    expect(parseOffset("+14:30")).toBeNull();
    expect(parseOffset("+15:00")).toBeNull();
    expect(parseOffset("-00:00")).toBeNull();
    expect(parseOffset("+03:60")).toBeNull();
  });
});

describe("occurredAt", () => {
  const parts = { date: "2026-10-01", time: "14:35:20.125" };
  it("UTC-03:00 equivale ao instante Z", () => {
    const rfc = buildRfc3339(parts, "-03:00");
    expect(rfc).toBe("2026-10-01T14:35:20.125-03:00");
    expect(toUtcIso(rfc!)).toBe("2026-10-01T17:35:20.125Z");
  });
  it("UTC e +05:45", () => {
    expect(toUtcIso(buildRfc3339(parts, "Z")!)).toBe("2026-10-01T14:35:20.125Z");
    expect(toUtcIso(buildRfc3339(parts, "+05:45")!)).toBe("2026-10-01T08:50:20.125Z");
  });
  it("preserva segundos ausentes como :00 e rejeita datas irreais", () => {
    expect(buildRfc3339({ date: "2026-10-01", time: "08:00" }, "-03:00")).toBe("2026-10-01T08:00:00-03:00");
    expect(buildRfc3339({ date: "2026-02-30", time: "08:00" }, "-03:00")).toBeNull();
  });
  it("detecta hora inexistente e repetida", () => {
    expect(resolveZoned({ date: "2026-03-08", time: "02:30" }, "America/New_York").kind).toBe("gap");
    expect(resolveZoned({ date: "2026-11-01", time: "01:30" }, "America/New_York").kind).toBe("ambiguous");
    expect(resolveZoned({ date: "2026-10-01", time: "10:00" }, "America/Fortaleza")).toEqual({ kind: "ok", offset: "-03:00" });
  });
});
