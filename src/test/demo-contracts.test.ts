import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { HidroApi } from "@/adapter/api";
import type { DiagnosisRequest, EnvironmentalInput } from "@/domain/types";
let api: HidroApi;
let setScenario: typeof import("@/demo/scenario").setScenario;
let body: DiagnosisRequest;
const lab = "lab-itapecuru",
  area = "area-beira-rio",
  col = "col-br-1";
async function call<T>(operation: () => Promise<T>): Promise<T> {
  // Attach both handlers before advancing timers, including expected rejections.
  const pending = operation().then(
    (value) => ({ value }),
    (error) => ({ error }),
  );
  await vi.advanceTimersByTimeAsync(2000);
  const result = await pending;
  if ("error" in result) throw result.error;
  return result.value;
}
beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  api = (await import("@/adapter/mock")).mockApi;
  setScenario = (await import("@/demo/scenario")).setScenario;
  const { IHFR_VERSIONS } = await import("@/domain/labels");
  const { inputContractVersion, ...versions } = IHFR_VERSIONS;
  body = {
    mode: "CREATE",
    expectedCurrentDiagnosisId: null,
    supplement: {
      inputContractVersion,
      landUseType: "FOREST",
      provenance: { kind: "FIELD_OBSERVATION", observedAt: "2026-10-01T12:00:00.000Z" },
    },
    versions,
  };
  setScenario({
    sessionUserId: "u-owner",
    failReads: false,
    ihfr: "AUTO",
    unknownEnvironmental: false,
    adminConflict: false,
  });
});
afterEach(() => vi.useRealTimers());
describe("Contratos da demonstração", () => {
  it("mantém UUID/payload/contexto no replay da coleta e recusa reutilização diferente", async () => {
    const key = crypto.randomUUID(),
      date = "2026-10-01T09:10:20.125-03:00";
    const first = await call(() => api.createCollection(lab, area, date, key));
    const replay = await call(() => api.createCollection(lab, area, date, key));
    expect(replay.collection).toEqual(first.collection);
    await expect(
      call(() => api.createCollection(lab, area, "2026-10-01T10:10:20-03:00", key)),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    await expect(
      call(() => api.createCollection(lab, "area-trizidela", date, key)),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });
  it("recupera IHFR incerto sem trocar o corpo e impede replay com outro suplemento", async () => {
    const key = crypto.randomUUID();
    setScenario({ ihfr: "UNKNOWN" });
    await expect(
      call(() => api.createDiagnosis(lab, area, "col-br-3", body, key)),
    ).rejects.toMatchObject({ status: 0 });
    const recovered = await call(() => api.getOperation(lab, area, "col-br-3", key));
    expect(recovered.outcome).toBe("INSUFFICIENT_DATA");
    const replay = await call(() => api.createDiagnosis(lab, area, "col-br-3", body, key));
    expect(replay).toEqual(recovered);
    await expect(
      call(() =>
        api.createDiagnosis(
          lab,
          area,
          "col-br-3",
          { ...body, supplement: { ...body.supplement, landUseType: "URBAN" } },
          key,
        ),
      ),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    await expect(call(() => api.getOperation(lab, area, col, key))).rejects.toMatchObject({
      status: 404,
    });
  });
  it("mantém o resultado terminal incompatível recuperável e o diagnóstico vigente", async () => {
    const current = (await call(() => api.currentDiagnosis(lab, area, col))).diagnosis!;
    const key = crypto.randomUUID();
    setScenario({ ihfr: "INCOMPATIBLE_VERSION" });
    await expect(
      call(() =>
        api.createDiagnosis(
          lab,
          area,
          col,
          { ...body, mode: "REPLACE", expectedCurrentDiagnosisId: current.id },
          key,
        ),
      ),
    ).rejects.toMatchObject({ status: 422, code: "INCOMPATIBLE_VERSION" });
    expect((await call(() => api.getOperation(lab, area, col, key))).outcome).toBe(
      "INCOMPATIBLE_VERSION",
    );
    expect((await call(() => api.currentDiagnosis(lab, area, col))).diagnosis?.id).toBe(current.id);
  });
  it("preserva null, zero e false nas medições e recusa body diferente na mesma chave", async () => {
    const input: EnvironmentalInput = {
      water: {
        waterSourceType: "SHALLOW_WELL",
        hasSpring: false,
        wellDepthMeters: 0,
        waterAvailability: "SCARCE",
        salinityIndicator: null,
      },
      soil: {
        soilTexture: "SANDY",
        infiltrationRateMmPerHour: 0,
        compactionLevel: "LOW",
        erosionSigns: "NONE",
        soilExposedPercent: 0,
      },
      vegetation: {
        vegetationCoverPercent: 0,
        fragmentationLevel: "LOW",
        hasRiparianApp: false,
        landscapeDegradation: "LOW",
      },
      terrain: { drainageDensityKmPerKm2: null, elevationMeters: -10, slopePercent: 150 },
    };
    const key = crypto.randomUUID();
    setScenario({ unknownEnvironmental: true });
    await expect(
      call(() => api.createEnvironmental(lab, area, "col-br-3", input, key)),
    ).rejects.toMatchObject({ status: 0 });
    const result = await call(() => api.createEnvironmental(lab, area, "col-br-3", input, key));
    expect(result.environmentalData).toMatchObject(input);
    await expect(
      call(() =>
        api.createEnvironmental(
          lab,
          area,
          "col-br-3",
          { ...input, terrain: { ...input.terrain, slopePercent: 1 } },
          key,
        ),
      ),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });
  it("separa ADMIN contextual de global, respeita MEMBER e laboratório inativo", async () => {
    setScenario({ sessionUserId: "u-member" });
    await expect(
      call(() =>
        api.createArea(lab, {
          name: "Área",
          latitude: 0,
          longitude: 0,
          municipality: null,
          state: null,
          landType: null,
          description: null,
        }),
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      call(() => api.createDiagnosis(lab, area, col, body, crypto.randomUUID())),
    ).rejects.toMatchObject({ status: 403 });
    setScenario({ sessionUserId: "u-labadmin" });
    expect((await call(() => api.getLaboratory(lab))).context.membershipRole).toBe("ADMIN");
    await expect(call(() => api.adminListUsers({}))).rejects.toMatchObject({ status: 403 });
    setScenario({ sessionUserId: "u-global" });
    await expect(call(() => api.getLaboratory(lab))).rejects.toMatchObject({ status: 404 });
    setScenario({ sessionUserId: "u-owner" });
    await expect(
      call(() =>
        api.createCollection(
          "lab-baixada",
          "area-pericuma",
          "2026-10-01T10:00:00Z",
          crypto.randomUUID(),
        ),
      ),
    ).rejects.toMatchObject({ code: "LABORATORY_INACTIVE" });
  });
  it("atualiza revisão após conflito administrativo e audita somente a conta selecionada", async () => {
    setScenario({ sessionUserId: "u-global", adminConflict: true });
    const user = await call(() => api.adminGetUser("u-new"));
    const request = {
      expectedStatus: user.status,
      expectedRevision: user.revision,
      status: "INACTIVE" as const,
      reason: "Teste sintético",
    };
    await expect(call(() => api.adminSetStatus(user.id, request))).rejects.toMatchObject({
      code: "REVISION_CONFLICT",
    });
    const fresh = await call(() => api.adminGetUser(user.id));
    expect(fresh.revision).toBe(user.revision + 1);
    const updated = await call(() =>
      api.adminSetStatus(user.id, { ...request, expectedRevision: fresh.revision }),
    );
    expect(updated.status).toBe("INACTIVE");
    const audit = await call(() => api.adminAudit(user.id));
    expect(audit.items).toHaveLength(1);
    expect(audit.items[0]).toMatchObject({ targetUserId: user.id, reason: "Teste sintético" });
    expect((await call(() => api.adminAudit("u-owner"))).items).toHaveLength(0);
  });
});
