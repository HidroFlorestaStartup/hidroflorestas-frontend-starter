// Interface do adapter. A implementação real usará fetch com `credentials: "include"` e `cache: "no-store"`
// contra os endpoints existentes; a demonstração usa `mock.ts`.
import type {
  AdminUser,
  AccountStatus,
  AreaDetail,
  AreaInput,
  AreaSummary,
  AuditEvent,
  Collection,
  DiagnosisRequest,
  Eligibility,
  EnvironmentalData,
  EnvironmentalInput,
  GlobalRole,
  HistoryItem,
  LabContext,
  LaboratoryDetails,
  LaboratorySummary,
  LandUseType,
  Membership,
  OperationResponse,
  PublicDiagnosis,
  PublicUser,
  TerritorialArea,
} from "@/domain/types";

/** Erro normalizado. `envelope` indica o formato original recebido. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { fields?: Record<string, string> },
    public envelope: "auth" | "domain" = "domain",
  ) {
    super(message);
  }
  get isNetwork() {
    return this.status === 0 || this.status >= 500;
  }
}

export interface SessionInfo {
  user: PublicUser;
  /** Contexto autorizado fornecido pela demonstração; na integração real vem de verificações do servidor. */
  isGlobalAdmin: boolean;
}

export interface HidroApi {
  signUp(b: { firstName: string; lastName: string; email: string; password: string }): Promise<{ user: PublicUser }>;
  signIn(b: { email: string; password: string }): Promise<{ user: PublicUser; destination: string }>;
  me(): Promise<SessionInfo>;
  logout(): Promise<void>;

  listLaboratories(): Promise<LaboratorySummary[]>;
  createLaboratory(name: string): Promise<LaboratorySummary>;
  getLaboratory(labId: string): Promise<{ details: LaboratoryDetails; context: LabContext }>;
  deactivateLaboratory(labId: string, confirmationName: string): Promise<{ action: "DEACTIVATED" }>;
  deleteLaboratory(labId: string, confirmationName: string): Promise<{ action: "DELETED" }>;
  listMemberships(labId: string): Promise<{ context: LabContext; memberships: Membership[] }>;
  updateMembership(labId: string, id: string, b: { expectedRole: "MEMBER" | "ADMIN"; role: "MEMBER" | "ADMIN" }): Promise<{ membership: Membership }>;

  listAreas(labId: string): Promise<{ context: LabContext; areas: AreaSummary[] }>;
  createArea(labId: string, b: AreaInput): Promise<{ area: AreaSummary }>;
  getArea(labId: string, areaId: string): Promise<{ area: AreaDetail }>;

  createCollection(labId: string, areaId: string, occurredAt: string, idempotencyKey: string): Promise<{ collection: Collection }>;
  getCollection(labId: string, areaId: string, collectionId: string): Promise<{ collection: Collection }>;

  getEnvironmental(labId: string, areaId: string, collectionId: string): Promise<{ environmentalData: EnvironmentalData | null }>;
  createEnvironmental(labId: string, areaId: string, collectionId: string, b: EnvironmentalInput, key: string): Promise<{ environmentalData: EnvironmentalData }>;

  summary(labId: string): Promise<{ context: LabContext; totals: { areas: number; confirmedCollections: number } }>;
  history(labId: string, cursor?: string): Promise<{ context: LabContext; items: HistoryItem[]; page: { nextCursor: string | null } }>;
  territorialMap(labId: string): Promise<{ context: LabContext; areas: TerritorialArea[] }>;

  currentDiagnosis(labId: string, areaId: string, collectionId: string): Promise<{ diagnosis: PublicDiagnosis | null }>;
  eligibility(labId: string, areaId: string, collectionId: string, landUseType?: LandUseType): Promise<Eligibility>;
  createDiagnosis(labId: string, areaId: string, collectionId: string, b: DiagnosisRequest, key: string): Promise<OperationResponse>;
  getDiagnosis(labId: string, areaId: string, collectionId: string, id: string): Promise<{ diagnosis: PublicDiagnosis }>;
  revokeDiagnosis(labId: string, areaId: string, collectionId: string, id: string, b: { expectedCurrentDiagnosisId: string; reason: string }, key: string): Promise<OperationResponse>;
  getOperation(labId: string, areaId: string, collectionId: string, key: string): Promise<OperationResponse>;

  adminListUsers(q: { search?: string; role?: GlobalRole; status?: AccountStatus; limit?: number; cursor?: string }): Promise<{ items: AdminUser[]; nextCursor: string | null }>;
  adminGetUser(id: string): Promise<AdminUser>;
  adminSetStatus(id: string, b: { expectedStatus: AccountStatus; expectedRevision: number; status: AccountStatus; reason: string }): Promise<AdminUser>;
  adminSetRole(id: string, b: { expectedRole: GlobalRole; expectedRevision: number; role: GlobalRole; reason: string }): Promise<AdminUser>;
  adminAudit(id: string, cursor?: string): Promise<{ items: AuditEvent[]; nextCursor: string | null }>;
}

export const newIdempotencyKey = () => crypto.randomUUID();
