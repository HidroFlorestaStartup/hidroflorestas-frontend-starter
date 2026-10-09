import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUuid } from "./random-uuid";

const cryptoApi = globalThis.crypto;
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.unstubAllGlobals());

describe("randomUuid", () => {
  it("usa randomUUID nativo quando disponível", () => {
    const native = vi.fn(() => "550e8400-e29b-41d4-a716-446655440000" as const);
    vi.stubGlobal("crypto", { randomUUID: native });
    expect(randomUuid()).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(native).toHaveBeenCalledOnce();
  });

  it("gera UUIDs v4 distintos sem randomUUID, como no HTTP da rede local", () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => cryptoApi.getRandomValues(bytes));
    vi.stubGlobal("crypto", { getRandomValues });
    const ids = Array.from({ length: 100 }, () => randomUuid());
    expect(ids.every((id) => uuidV4.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getRandomValues).toHaveBeenCalledTimes(ids.length);
  });
});
