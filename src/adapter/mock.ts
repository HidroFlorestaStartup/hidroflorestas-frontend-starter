// Implementação SINTÉTICA do adapter para a demonstração. Todos os dados são fictícios.
// Nenhuma função aqui calcula IHFR: resultados vêm de fixtures predefinidas.
import { IHFR_VERSIONS, SCIENTIFIC_LABELS, initials } from "@/domain/labels";
import type {
  AccountStatus,
  AdminUser,
  AreaDetail,
  AreaSummary,
  AuditEvent,
  DiagnosisRequest,
  EnvironmentalData,
  GlobalRole,
  HistoryItem,
  IhfrClass,
  InsufficiencyReason,
  LabContext,
  LabRole,
  LabStatus,
  OperationResponse,
  PublicDiagnosis,
} from "@/domain/types";
import { getScenario, setScenario } from "@/demo/scenario";
import { ApiError, type HidroApi } from "./api";

const DAY = 86400000;
const ago = (days: number, h = 0) => new Date(Date.now() - days * DAY - h * 3600000).toISOString();
/** RFC3339 com offset -03:00 a partir de um instante. */
const withOffset = (iso: string, offMin = -180) => {
  const d = new Date(new Date(iso).getTime() + offMin * 60000);
  const sign = offMin < 0 ? "-" : "+";
  const a = Math.abs(offMin);
  return `${d.toISOString().slice(0, 23)}${sign}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
};
const uid = () => crypto.randomUUID();

// ---------------- Pessoas ----------------
interface DbUser extends AdminUser {}
const users: DbUser[] = [
  mkUser("u-owner", "Luciano", "Mendes", "luciano@demo.hidroflorestas.org", "USER", "ACTIVE", 120),
  mkUser("u-labadmin", "Pedro Vitor", "Brito", "pedro@demo.hidroflorestas.org", "USER", "ACTIVE", 110),
  mkUser("u-member", "Ana", "Souza", "ana@demo.hidroflorestas.org", "USER", "ACTIVE", 90),
  mkUser("u-global", "Carla", "Ribeiro", "carla@demo.hidroflorestas.org", "ADMIN", "ACTIVE", 300),
  mkUser("u-new", "Marcos", "Lima", "marcos@demo.hidroflorestas.org", "USER", "ACTIVE", 2),
  mkUser("u-full", "Júlia", "Castro", "julia@demo.hidroflorestas.org", "USER", "ACTIVE", 200),
  mkUser("u-blocked", "Rafael", "Nunes", "rafael@demo.hidroflorestas.org", "USER", "BLOCKED", 60),
  mkUser("u-pending", "Beatriz", "Alves", "beatriz@demo.hidroflorestas.org", "MODERATOR", "PENDING", 10),
  mkUser("u-inactive", "Tiago", "Moreira", "tiago@demo.hidroflorestas.org", "DEVELOPER", "INACTIVE", 45),
];
for (let i = 1; i <= 24; i++)
  users.push(mkUser(`u-extra-${i}`, `Pessoa ${i}`, "Sintética", `pessoa${i}@demo.hidroflorestas.org`, "USER", i % 7 === 0 ? "INACTIVE" : "ACTIVE", 30 + i));

function mkUser(id: string, f: string, l: string, email: string, role: GlobalRole, status: AccountStatus, days: number): DbUser {
  return { id, firstName: f, lastName: l, email, role, status, revision: 1, createdAt: ago(days), updatedAt: ago(days) };
}
const audit: AuditEvent[] = [
  { id: uid(), targetUserId: "u-blocked", actorUserId: "u-global", action: "ACCOUNT_STATUS_CHANGED", beforeValue: "ACTIVE", afterValue: "BLOCKED", reason: "Tentativas de acesso suspeitas (demonstração).", targetRevision: 1, createdAt: ago(20) },
];

// ---------------- Laboratórios ----------------
interface DbLab { id: string; name: string; createdAt: string; status: LabStatus; ownerId: string; members: { id: string; userId: string; role: LabRole }[] }
const labs: DbLab[] = [
  { id: "lab-itapecuru", name: "Laboratório IHFR Itapecuru", createdAt: ago(100), status: "ACTIVE", ownerId: "u-owner", members: [
    { id: "m1", userId: "u-owner", role: "OWNER" },
    { id: "m2", userId: "u-labadmin", role: "ADMIN" },
    { id: "m3", userId: "u-member", role: "MEMBER" },
    { id: "m4", userId: "u-full", role: "MEMBER" },
  ] },
  { id: "lab-baixada", name: "Laboratório Baixada Maranhense", createdAt: ago(250), status: "INACTIVE", ownerId: "u-owner", members: [
    { id: "m5", userId: "u-owner", role: "OWNER" },
    { id: "m6", userId: "u-member", role: "MEMBER" },
  ] },
];
for (let i = 1; i <= 4; i++)
  labs.push({ id: `lab-julia-${i}`, name: `Laboratório de campo ${i}`, createdAt: ago(150 - i * 10), status: "ACTIVE", ownerId: "u-full", members: [{ id: `mj${i}`, userId: "u-full", role: "OWNER" }] });

// ---------------- Áreas, coletas, medições ----------------
interface DbArea extends Omit<AreaDetail, "laboratory" | "readOnly"> { labId: string; mapLocationMissing?: boolean }
const areas: DbArea[] = [
  { id: "area-beira-rio", labId: "lab-itapecuru", name: "Beira Rio de Itapecuru-Mirim", latitude: -3.3925, longitude: -44.3589, municipality: "Itapecuru-Mirim", state: "MA", landType: "Margem urbana de rio", description: "Trecho de margem próximo à ponte, com vegetação ciliar fragmentada.", createdAt: ago(90) },
  { id: "area-trizidela", labId: "lab-itapecuru", name: "Bairro Trizidela Campi", latitude: -3.401, longitude: -44.351, municipality: "Itapecuru-Mirim", state: "MA", landType: null, description: null, createdAt: ago(60) },
  { id: "area-nascente", labId: "lab-itapecuru", name: "Nascente do Riacho Seco", latitude: -3.45, longitude: -44.3, municipality: null, state: null, landType: null, description: null, createdAt: ago(30), mapLocationMissing: true },
  { id: "area-pericuma", labId: "lab-baixada", name: "Várzea do Pericumã", latitude: -2.53073, longitude: -44.30682, municipality: "Pinheiro", state: "MA", landType: "Várzea", description: null, createdAt: ago(200) },
];

interface DbCollection { id: string; areaId: string; occurredAt: string; confirmedAt: string; key?: string }
const collections: DbCollection[] = [
  { id: "col-br-1", areaId: "area-beira-rio", occurredAt: withOffset(ago(40, 3)), confirmedAt: ago(40, 1) },
  { id: "col-br-2", areaId: "area-beira-rio", occurredAt: withOffset(ago(20, 5)), confirmedAt: ago(20, 2) },
  { id: "col-br-3", areaId: "area-beira-rio", occurredAt: withOffset(ago(5, 2), 0), confirmedAt: ago(5, 1) },
  { id: "col-tz-1", areaId: "area-trizidela", occurredAt: withOffset(ago(12, 4)), confirmedAt: ago(12, 3) },
  { id: "col-ns-1", areaId: "area-nascente", occurredAt: withOffset(ago(8, 6), 345), confirmedAt: ago(8, 5) },
  { id: "col-pc-1", areaId: "area-pericuma", occurredAt: withOffset(ago(190, 3)), confirmedAt: ago(190, 1) },
];

const baseEnv = (collectionId: string, slope: number | null, days: number): EnvironmentalData => ({
  id: uid(),
  collectionId,
  measurementContractVersion: IHFR_VERSIONS.measurementContractVersion,
  confirmedAt: ago(days),
  readOnly: true,
  water: { waterSourceType: "SHALLOW_WELL", hasSpring: false, wellDepthMeters: 9.4, waterAvailability: "SEASONAL", salinityIndicator: "SUSPECTED" },
  soil: { soilTexture: "SANDY", infiltrationRateMmPerHour: 32.5, compactionLevel: "MEDIUM", erosionSigns: "LAMINAR", soilExposedPercent: 0 },
  vegetation: { vegetationCoverPercent: 45, fragmentationLevel: "HIGH", hasRiparianApp: false, landscapeDegradation: "MEDIUM" },
  terrain: { drainageDensityKmPerKm2: null, elevationMeters: 18, slopePercent: slope },
});
const environmental = new Map<string, EnvironmentalData>([
  ["col-br-1", baseEnv("col-br-1", 6.5, 40)],
  ["col-br-2", baseEnv("col-br-2", null, 20)],
  ["col-tz-1", { ...baseEnv("col-tz-1", 3, 12), water: { waterSourceType: "RIVER_STREAM", hasSpring: true, wellDepthMeters: null, waterAvailability: "PERMANENT", salinityIndicator: null } }],
  ["col-pc-1", baseEnv("col-pc-1", 2, 190)],
]);
const envKeys = new Map<string, string>();

// ---------------- IHFR (fixtures) ----------------
const FIXTURES: { displayScore: number; rawScore: number; ihfrClass: IhfrClass; dataQuality: PublicDiagnosis["dataQuality"]; comp: PublicDiagnosis["componentScores"]; drivers: PublicDiagnosis["drivers"] }[] = [
  { displayScore: 0.62, rawScore: 0.6234, ihfrClass: "HIGH", dataQuality: "MEDIUM", comp: { W: 0.58, S: 0.66, V: 0.71, T: 0.49 }, drivers: ["V", "S"] },
  { displayScore: 0.41, rawScore: 0.4071, ihfrClass: "MODERATE", dataQuality: "HIGH", comp: { W: 0.38, S: 0.45, V: 0.44, T: 0.36 }, drivers: ["S"] },
  { displayScore: 0.84, rawScore: 0.8449, ihfrClass: "CRITICAL", dataQuality: "LOW", comp: { W: 0.81, S: 0.88, V: 0.86, T: 0.79 }, drivers: ["S", "V", "W"] },
];
let fixtureIdx = 0;
const diagnoses: (PublicDiagnosis & { labId: string })[] = [];
const operations = new Map<string, OperationResponse>();

function mkDiagnosis(labId: string, areaId: string, collectionId: string, days: number, state: PublicDiagnosis["lifecycleState"] = "CURRENT"): PublicDiagnosis & { labId: string } {
  const f = FIXTURES[fixtureIdx++ % FIXTURES.length];
  const env = environmental.get(collectionId)!;
  return {
    labId, id: uid(), areaId, collectionId, environmentalMeasurementSetId: env.id, inputSupplementId: uid(), lifecycleState: state,
    rawScore: f.rawScore, displayScore: f.displayScore, ihfrClass: f.ihfrClass, dataQuality: f.dataQuality, componentScores: f.comp,
    decomposition: { W: { observacao: "detalhe retornado pelo servidor (simulado)" } }, drivers: f.drivers,
    explanation: `Resultado simulado — demonstração. Componentes com maior contribuição: ${f.drivers.join(", ")}. Explicação determinística retornada pelo servidor, sem IA.`,
    versions: { ...IHFR_VERSIONS }, calculatedAt: ago(days), validFrom: ago(days), transitionedAt: null,
    scientificState: "EXPERIMENTAL", scientificLabels: [...SCIENTIFIC_LABELS],
  };
}
diagnoses.push(mkDiagnosis("lab-itapecuru", "area-beira-rio", "col-br-1", 38));
diagnoses.push(mkDiagnosis("lab-baixada", "area-pericuma", "col-pc-1", 185));

// ---------------- Infra de simulação ----------------
const wait = () => new Promise((r) => setTimeout(r, getScenario().latency === "slow" ? 1600 : 350));
async function read<T>(fn: () => T): Promise<T> {
  await wait();
  if (getScenario().failReads) throw new ApiError(500, "INTERNAL", "Não foi possível conectar ao servidor.");
  return fn();
}
async function write<T>(fn: () => T): Promise<T> {
  await wait();
  return fn();
}
const notFound = () => new ApiError(404, "NOT_FOUND", "Recurso não encontrado ou indisponível.");
const forbidden = () => new ApiError(403, "FORBIDDEN", "Você não tem permissão para esta ação.");
const readOnlyErr = () => new ApiError(409, "LABORATORY_INACTIVE", "Laboratório inativo — somente leitura.");

function sessionUser(): DbUser {
  const id = getScenario().sessionUserId;
  const u = users.find((x) => x.id === id);
  if (!u || u.status !== "ACTIVE") throw new ApiError(401, "UNAUTHENTICATED", "Sessão expirada. Entre novamente.", undefined, "auth");
  return u;
}
function labFor(labId: string): { lab: DbLab; ctx: LabContext } {
  const u = sessionUser();
  const lab = labs.find((l) => l.id === labId);
  const m = lab?.members.find((x) => x.userId === u.id);
  if (!lab || !m) throw notFound(); // não revelar existência
  return { lab, ctx: { id: lab.id, name: lab.name, status: lab.status, membershipRole: m.role, readOnly: lab.status !== "ACTIVE" } };
}
function areaFor(labId: string, areaId: string) {
  const r = labFor(labId);
  const area = areas.find((a) => a.id === areaId && a.labId === labId);
  if (!area) throw notFound();
  return { ...r, area };
}
function collectionFor(labId: string, areaId: string, colId: string) {
  const r = areaFor(labId, areaId);
  const col = collections.find((c) => c.id === colId && c.areaId === areaId);
  if (!col) throw notFound();
  return { ...r, col };
}
const requireWrite = (ctx: LabContext, roles: LabRole[]) => {
  if (ctx.readOnly) throw readOnlyErr();
  if (!roles.includes(ctx.membershipRole)) throw forbidden();
};
const accessibleLabs = (userId: string) => labs.filter((l) => l.members.some((m) => m.userId === userId));
const userName = (id: string) => {
  const u = users.find((x) => x.id === id)!;
  return { name: `${u.firstName} ${u.lastName}`, initials: initials(u.firstName, u.lastName) };
};
const publicUser = (u: DbUser) => ({ firstName: u.firstName, lastName: u.lastName, image: null });
const stripDiag = ({ labId: _l, ...d }: PublicDiagnosis & { labId: string }): PublicDiagnosis => d;

function eligibilityOf(colId: string, landUse: string | null | undefined): InsufficiencyReason[] {
  const env = environmental.get(colId);
  const r: InsufficiencyReason[] = [];
  if (!env) r.push("MISSING_ENVIRONMENTAL_DATA");
  else if (env.terrain.slopePercent === null) r.push("MISSING_SLOPE_PERCENT");
  if (!landUse) r.push("MISSING_LAND_USE_TYPE");
  return r;
}

// ---------------- Implementação ----------------
export const mockApi: HidroApi = {
  async signUp(b) {
    await wait();
    if (users.some((u) => u.email.toLowerCase() === b.email.trim().toLowerCase()))
      throw new ApiError(409, "EMAIL_TAKEN", "Não foi possível criar a conta com estes dados.", undefined, "auth");
    const u = mkUser(uid(), b.firstName.trim(), b.lastName.trim(), b.email.trim(), "USER", "ACTIVE", 0);
    users.push(u);
    setScenario({ sessionUserId: u.id });
    return { user: publicUser(u) };
  },
  async signIn(b) {
    await wait();
    const u = users.find((x) => x.email.toLowerCase() === b.email.trim().toLowerCase());
    if (!u || u.status !== "ACTIVE" || b.password.length === 0)
      throw new ApiError(401, "INVALID_CREDENTIALS", "Email ou senha inválidos.", undefined, "auth");
    setScenario({ sessionUserId: u.id });
    return { user: publicUser(u), destination: u.role === "ADMIN" ? "/admin" : "/workspace" };
  },
  async me() {
    await wait();
    const u = sessionUser();
    return { user: publicUser(u), isGlobalAdmin: u.role === "ADMIN" };
  },
  async logout() {
    await wait();
    if (getScenario().failLogout) throw new ApiError(500, "LOGOUT_FAILED", "Não foi possível encerrar a sessão.", undefined, "auth");
    setScenario({ sessionUserId: null });
  },

  listLaboratories: () => read(() => {
    const u = sessionUser();
    return accessibleLabs(u.id).map((l) => ({ id: l.id, name: l.name, createdAt: l.createdAt, status: l.status, isOwner: l.ownerId === u.id }));
  }),
  createLaboratory: (name) => write(() => {
    const u = sessionUser();
    const n = name.trim();
    if (n.length < 1 || n.length > 100) throw new ApiError(400, "VALIDATION", "Informe um nome entre 1 e 100 caracteres.");
    if (accessibleLabs(u.id).length >= 5) throw new ApiError(409, "LABORATORY_LIMIT_REACHED", "Limite de cinco laboratórios atingido.");
    const lab: DbLab = { id: uid(), name: n, createdAt: new Date().toISOString(), status: "ACTIVE", ownerId: u.id, members: [{ id: uid(), userId: u.id, role: "OWNER" }] };
    labs.push(lab);
    return { id: lab.id, name: lab.name, createdAt: lab.createdAt, status: lab.status, isOwner: true };
  }),
  getLaboratory: (labId) => read(() => {
    const { lab, ctx } = labFor(labId);
    return { context: ctx, details: { id: lab.id, name: lab.name, createdAt: lab.createdAt, status: lab.status, isOwner: ctx.membershipRole === "OWNER", members: lab.members.map((m) => userName(m.userId)) } };
  }),
  deactivateLaboratory: (labId, confirmationName) => write(() => {
    const { lab, ctx } = labFor(labId);
    if (ctx.membershipRole !== "OWNER") throw forbidden();
    if (lab.status !== "ACTIVE") throw readOnlyErr();
    if (confirmationName !== lab.name) throw new ApiError(400, "CONFIRMATION_MISMATCH", "O nome digitado não corresponde ao laboratório.");
    lab.status = "INACTIVE";
    return { action: "DEACTIVATED" as const };
  }),
  deleteLaboratory: (labId, confirmationName) => write(() => {
    const { lab, ctx } = labFor(labId);
    if (ctx.membershipRole !== "OWNER") throw forbidden();
    if (confirmationName !== lab.name) throw new ApiError(400, "CONFIRMATION_MISMATCH", "O nome digitado não corresponde ao laboratório.");
    if (areas.some((a) => a.labId === labId)) throw new ApiError(409, "LABORATORY_HAS_SCIENTIFIC_DATA", "Não é possível excluir: o laboratório já possui áreas cadastradas.");
    labs.splice(labs.indexOf(lab), 1);
    return { action: "DELETED" as const };
  }),
  listMemberships: (labId) => read(() => {
    const { lab, ctx } = labFor(labId);
    return { context: ctx, memberships: lab.members.map((m) => ({ id: m.id, role: m.role, ...userName(m.userId) })) };
  }),
  updateMembership: (labId, id, b) => write(() => {
    const { lab, ctx } = labFor(labId);
    requireWrite(ctx, ["OWNER"]);
    const m = lab.members.find((x) => x.id === id);
    if (!m) throw notFound();
    if (m.role === "OWNER") throw forbidden();
    if (m.role !== b.expectedRole) throw new ApiError(409, "STATE_CONFLICT", "O papel foi alterado por outra pessoa. Atualize e revise.");
    m.role = b.role;
    return { membership: { id: m.id, role: m.role, ...userName(m.userId) } };
  }),

  listAreas: (labId) => read(() => {
    const { ctx } = labFor(labId);
    return { context: ctx, areas: areas.filter((a) => a.labId === labId).map(({ id, name, latitude, longitude, municipality, state }) => ({ id, name, latitude, longitude, municipality, state })) };
  }),
  createArea: (labId, b) => write(() => {
    const { ctx } = labFor(labId);
    requireWrite(ctx, ["OWNER", "ADMIN"]);
    const a: DbArea = { id: uid(), labId, ...b, createdAt: new Date().toISOString() };
    areas.push(a);
    const s: AreaSummary = { id: a.id, name: a.name, latitude: a.latitude, longitude: a.longitude, municipality: a.municipality, state: a.state };
    return { area: s };
  }),
  getArea: (labId, areaId) => read(() => {
    const { lab, ctx, area } = areaFor(labId, areaId);
    const { labId: _l, mapLocationMissing: _m, ...rest } = area;
    return { area: { ...rest, laboratory: { id: lab.id, name: lab.name, status: lab.status }, readOnly: ctx.readOnly } };
  }),

  createCollection: (labId, areaId, occurredAt, key) => write(() => {
    const { ctx } = areaFor(labId, areaId);
    requireWrite(ctx, ["OWNER", "ADMIN", "MEMBER"]);
    const existing = collections.find((c) => c.key === key);
    if (existing) {
      if (existing.occurredAt !== occurredAt) throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "Esta tentativa já foi usada com outros dados.");
    } else collections.push({ id: uid(), areaId, occurredAt, confirmedAt: new Date().toISOString(), key });
    const c = collections.find((x) => x.key === key)!;
    return mockApi.getCollection(labId, areaId, c.id);
  }),
  getCollection: async (labId, areaId, colId) => {
    await wait();
    const { lab, ctx, area, col } = collectionFor(labId, areaId, colId);
    return { collection: { id: col.id, occurredAt: col.occurredAt, confirmedAt: col.confirmedAt, area: { id: area.id, name: area.name }, laboratory: { id: lab.id, name: lab.name, status: lab.status }, readOnly: ctx.readOnly } };
  },

  getEnvironmental: (labId, areaId, colId) => read(() => {
    collectionFor(labId, areaId, colId);
    return { environmentalData: environmental.get(colId) ?? null };
  }),
  createEnvironmental: (labId, areaId, colId, b, key) => write(() => {
    const { ctx } = collectionFor(labId, areaId, colId);
    requireWrite(ctx, ["OWNER", "ADMIN", "MEMBER"]);
    const prev = environmental.get(colId);
    if (prev) {
      if (envKeys.get(colId) === key) return { environmentalData: prev };
      throw new ApiError(409, "ENVIRONMENTAL_DATA_EXISTS", "Esta coleta já possui um conjunto ambiental confirmado.");
    }
    const data: EnvironmentalData = { ...b, id: uid(), collectionId: colId, measurementContractVersion: IHFR_VERSIONS.measurementContractVersion, confirmedAt: new Date().toISOString(), readOnly: true };
    environmental.set(colId, data);
    envKeys.set(colId, key);
    if (getScenario().unknownEnvironmental) {
      setScenario({ unknownEnvironmental: false });
      throw new ApiError(0, "NETWORK", "Não foi possível conectar ao servidor.");
    }
    return { environmentalData: data };
  }),

  summary: (labId) => read(() => {
    const { ctx } = labFor(labId);
    const ids = areas.filter((a) => a.labId === labId).map((a) => a.id);
    return { context: ctx, totals: { areas: ids.length, confirmedCollections: collections.filter((c) => ids.includes(c.areaId)).length } };
  }),
  history: (labId, cursor) => read(() => {
    const { ctx } = labFor(labId);
    const la = areas.filter((a) => a.labId === labId);
    const items: HistoryItem[] = [
      ...la.map((a) => ({ id: `h-${a.id}`, type: "AREA_CREATED" as const, label: "Área de monitoramento criada", eventAt: a.createdAt, area: { id: a.id, name: a.name }, destination: `/dashboard/laboratories/${labId}/areas/${a.id}` })),
      ...collections.filter((c) => la.some((a) => a.id === c.areaId)).map((c) => {
        const a = la.find((x) => x.id === c.areaId)!;
        return { id: `h-${c.id}`, type: "COLLECTION_CONFIRMED" as const, label: "Coleta confirmada", eventAt: c.confirmedAt, area: { id: a.id, name: a.name }, destination: `/dashboard/laboratories/${labId}/areas/${a.id}/collections/${c.id}`, collection: { id: c.id }, occurredAt: c.occurredAt };
      }),
    ].sort((x, y) => y.eventAt.localeCompare(x.eventAt));
    const PAGE = 5; // contrato: até 20; menor aqui para demonstrar paginação
    const start = cursor ? Number(atob(cursor)) : 0;
    const next = start + PAGE < items.length ? btoa(String(start + PAGE)) : null;
    return { context: ctx, items: items.slice(start, start + PAGE), page: { nextCursor: next } };
  }),
  territorialMap: (labId) => read(() => {
    const { ctx } = labFor(labId);
    return { context: ctx, areas: areas.filter((a) => a.labId === labId).map((a) => ({
      id: a.id, name: a.name,
      location: a.mapLocationMissing ? null : { latitude: a.latitude, longitude: a.longitude },
      confirmedCollections: collections.filter((c) => c.areaId === a.id).map((c) => ({ id: c.id, occurredAt: c.occurredAt, confirmedAt: c.confirmedAt })),
    })) };
  }),

  currentDiagnosis: (labId, areaId, colId) => read(() => {
    collectionFor(labId, areaId, colId);
    const d = diagnoses.find((x) => x.collectionId === colId && x.lifecycleState === "CURRENT");
    return { diagnosis: d ? stripDiag(d) : null };
  }),
  eligibility: (labId, areaId, colId, landUseType) => read(() => {
    collectionFor(labId, areaId, colId);
    const reasons = eligibilityOf(colId, landUseType);
    const cur = diagnoses.find((x) => x.collectionId === colId && x.lifecycleState === "CURRENT");
    return { eligible: reasons.length === 0, outcome: reasons.length ? "INSUFFICIENT_DATA" : "SUCCEEDED", reasons, hasCurrentDiagnosis: !!cur, currentDiagnosisId: cur?.id ?? null };
  }),
  createDiagnosis: (labId, areaId, colId, b: DiagnosisRequest, key) => write(() => {
    const { ctx } = collectionFor(labId, areaId, colId);
    requireWrite(ctx, ["OWNER", "ADMIN"]);
    const prev = operations.get(key);
    if (prev) return prev; // replay idêntico (200)
    const cur = diagnoses.find((x) => x.collectionId === colId && x.lifecycleState === "CURRENT");
    if (b.mode === "CREATE" && cur) throw new ApiError(409, "STATE_CONFLICT", "Já existe um diagnóstico vigente. Atualize antes de agir.");
    if (b.mode === "REPLACE" && cur?.id !== b.expectedCurrentDiagnosisId) throw new ApiError(409, "STATE_CONFLICT", "O diagnóstico vigente mudou. Atualize antes de agir.");
    const mode = getScenario().ihfr;
    let res: OperationResponse;
    if (mode === "INCOMPATIBLE_VERSION") {
      res = { outcome: "INCOMPATIBLE_VERSION", diagnosis: null, insufficiencyReasons: [] };
      operations.set(key, res);
      throw Object.assign(new ApiError(422, "INCOMPATIBLE_VERSION", "Combinação de versões incompatível com o servidor."), { operation: res });
    }
    const reasons = mode === "INSUFFICIENT_DATA" ? (["INSUFFICIENT_DIMENSION"] as InsufficiencyReason[]) : eligibilityOf(colId, b.supplement.landUseType);
    if (reasons.length) res = { outcome: "INSUFFICIENT_DATA", diagnosis: null, insufficiencyReasons: reasons };
    else {
      if (cur) { cur.lifecycleState = "SUPERSEDED"; cur.transitionedAt = new Date().toISOString(); }
      const d = mkDiagnosis(labId, areaId, colId, 0);
      diagnoses.push(d);
      res = { outcome: "SUCCEEDED", diagnosis: stripDiag(d), insufficiencyReasons: [] };
    }
    operations.set(key, res);
    if (mode === "UNKNOWN") {
      setScenario({ ihfr: "AUTO" });
      throw new ApiError(0, "NETWORK", "Não foi possível conectar ao servidor.");
    }
    return res;
  }),
  getDiagnosis: (labId, areaId, colId, id) => read(() => {
    collectionFor(labId, areaId, colId);
    const d = diagnoses.find((x) => x.id === id && x.collectionId === colId);
    if (!d) throw notFound();
    return { diagnosis: stripDiag(d) };
  }),
  revokeDiagnosis: (labId, areaId, colId, id, b, key) => write(() => {
    const { ctx } = collectionFor(labId, areaId, colId);
    requireWrite(ctx, ["OWNER", "ADMIN"]);
    const prev = operations.get(key);
    if (prev) return prev;
    const d = diagnoses.find((x) => x.id === id && x.collectionId === colId);
    if (!d) throw notFound();
    if (d.lifecycleState !== "CURRENT" || b.expectedCurrentDiagnosisId !== id) throw new ApiError(409, "STATE_CONFLICT", "O diagnóstico vigente mudou. Atualize antes de agir.");
    const r = b.reason.trim();
    if (r.length < 1 || r.length > 500) throw new ApiError(400, "VALIDATION", "Informe um motivo entre 1 e 500 caracteres.");
    d.lifecycleState = "REVOKED";
    d.transitionedAt = new Date().toISOString();
    const res: OperationResponse = { outcome: "SUCCEEDED", diagnosis: stripDiag(d), insufficiencyReasons: [] };
    operations.set(key, res);
    return res;
  }),
  getOperation: async (labId, areaId, colId, key) => {
    await wait();
    collectionFor(labId, areaId, colId);
    const op = operations.get(key);
    if (!op) throw new ApiError(404, "OPERATION_NOT_FOUND", "Não há resultado terminal recuperável para esta tentativa.");
    return op;
  },

  adminListUsers: (q) => read(() => {
    const me = sessionUser();
    if (me.role !== "ADMIN") throw forbidden();
    const s = (q.search ?? "").trim().toLowerCase().slice(0, 120);
    const all = users.filter((u) =>
      (!s || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(s)) && (!q.role || u.role === q.role) && (!q.status || u.status === q.status));
    const limit = Math.min(Math.max(q.limit ?? 25, 1), 50);
    const start = q.cursor ? Number(atob(q.cursor)) : 0;
    return { items: all.slice(start, start + limit), nextCursor: start + limit < all.length ? btoa(String(start + limit)) : null };
  }),
  adminGetUser: (id) => read(() => {
    if (sessionUser().role !== "ADMIN") throw forbidden();
    const u = users.find((x) => x.id === id);
    if (!u) throw notFound();
    return { ...u };
  }),
  adminSetStatus: (id, b) => write(() => adminChange(id, "status", b.expectedStatus, b.expectedRevision, b.status, b.reason)),
  adminSetRole: (id, b) => write(() => adminChange(id, "role", b.expectedRole, b.expectedRevision, b.role, b.reason)),
  adminAudit: (id, cursor) => read(() => {
    if (sessionUser().role !== "ADMIN") throw forbidden();
    const all = audit.filter((a) => a.targetUserId === id).sort((x, y) => y.createdAt.localeCompare(x.createdAt));
    const start = cursor ? Number(atob(cursor)) : 0;
    return { items: all.slice(start, start + 25), nextCursor: start + 25 < all.length ? btoa(String(start + 25)) : null };
  }),
};

function adminChange(id: string, field: "status" | "role", expected: string, rev: number, value: string, reason: string): AdminUser {
  const me = sessionUser();
  if (me.role !== "ADMIN") throw forbidden();
  const u = users.find((x) => x.id === id);
  if (!u) throw notFound();
  if (u.id === me.id) throw new ApiError(409, "SELF_CHANGE_FORBIDDEN", "Você não pode alterar o próprio papel ou estado.");
  const r = reason.trim();
  if (r.length < 1 || r.length > 500) throw new ApiError(400, "VALIDATION", "Informe uma justificativa entre 1 e 500 caracteres.");
  if (getScenario().adminConflict) {
    setScenario({ adminConflict: false });
    u.revision += 1;
    u.updatedAt = new Date().toISOString();
    throw new ApiError(409, "REVISION_CONFLICT", "A conta foi alterada por outra pessoa. Os dados foram atualizados; revise novamente.");
  }
  if (u.revision !== rev || u[field] !== expected) throw new ApiError(409, "REVISION_CONFLICT", "A conta foi alterada por outra pessoa. Revise novamente.");
  const willLoseAdmin = u.role === "ADMIN" && u.status === "ACTIVE" && ((field === "role" && value !== "ADMIN") || (field === "status" && value !== "ACTIVE"));
  if (willLoseAdmin && users.filter((x) => x.role === "ADMIN" && x.status === "ACTIVE").length <= 1)
    throw new ApiError(409, "LAST_ADMIN", "A plataforma não pode ficar sem administrador ativo.");
  const before = u[field];
  (u as unknown as Record<string, string>)[field] = value;
  u.revision += 1;
  u.updatedAt = new Date().toISOString();
  audit.push({ id: uid(), targetUserId: u.id, actorUserId: me.id, action: field === "status" ? "ACCOUNT_STATUS_CHANGED" : "GLOBAL_ROLE_CHANGED", beforeValue: before, afterValue: value, reason: r, targetRevision: u.revision, createdAt: u.updatedAt });
  return { ...u };
}

/** Lista de contas fictícias para o painel de demonstração. */
export const demoPersonas = [
  { id: "u-owner", label: "Proprietário (OWNER) — Luciano", hint: "Dono de 1 laboratório ativo e 1 inativo" },
  { id: "u-labadmin", label: "Admin. do laboratório — Pedro", hint: "ADMIN contextual" },
  { id: "u-member", label: "Membro (MEMBER) — Ana", hint: "Registra coletas e medições" },
  { id: "u-global", label: "Admin. global — Carla", hint: "Sem vínculo com laboratório" },
  { id: "u-new", label: "Conta sem laboratório — Marcos", hint: "Primeiro acesso" },
  { id: "u-full", label: "Limite de 5 laboratórios — Júlia", hint: "Não pode criar mais" },
].map((p) => ({ ...p, email: users.find((u) => u.id === p.id)!.email }));
