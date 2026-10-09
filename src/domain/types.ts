// DTOs espelhando os contratos HTTP do HidroFlorestas. Nomes e enums são técnicos e não devem ser traduzidos.

export type GlobalRole = "USER" | "ADMIN" | "DEVELOPER" | "MODERATOR";
export type AccountStatus = "ACTIVE" | "PENDING" | "INACTIVE" | "BLOCKED";
export type LabRole = "OWNER" | "ADMIN" | "MEMBER";
export type LabStatus = "ACTIVE" | "INACTIVE";

export interface PublicUser {
  firstName: string;
  lastName: string;
  image: string | null;
}

export interface LaboratorySummary {
  id: string;
  name: string;
  createdAt: string;
  status: LabStatus;
  isOwner: boolean;
}

export interface LabContext {
  id: string;
  name: string;
  status: LabStatus;
  membershipRole: LabRole;
  readOnly: boolean;
}

export interface LaboratoryDetails extends LaboratorySummary {
  members: { name: string; initials: string }[];
}

export interface Membership {
  id: string;
  name: string;
  initials: string;
  role: LabRole;
}

export interface AreaSummary {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  municipality: string | null;
  state: string | null;
}

export interface AreaDetail extends AreaSummary {
  landType: string | null;
  description: string | null;
  createdAt: string;
  laboratory: { id: string; name: string; status: LabStatus };
  readOnly: boolean;
}

export interface AreaInput {
  name: string;
  latitude: number;
  longitude: number;
  municipality: string | null;
  state: string | null;
  landType: string | null;
  description: string | null;
}

export interface Collection {
  id: string;
  occurredAt: string;
  confirmedAt: string;
  area: { id: string; name: string };
  laboratory: { id: string; name: string; status: LabStatus };
  readOnly: boolean;
}

// --- Dados ambientais (ihfr-measurement-v1) ---
export type WaterSourceType =
  | "RIVER_STREAM"
  | "SPRING"
  | "SHALLOW_WELL"
  | "TUBULAR_WELL"
  | "CISTERN"
  | "OTHER";
export type WaterAvailability = "PERMANENT" | "SEASONAL" | "SCARCE";
export type SalinityIndicator = "NONE" | "SUSPECTED" | "CONFIRMED";
export type SoilTexture = "SANDY" | "MEDIUM" | "CLAYEY";
export type Level = "LOW" | "MEDIUM" | "HIGH";
export type ErosionSigns = "NONE" | "LAMINAR" | "RILLS_GULLIES";

export interface EnvironmentalInput {
  water: {
    waterSourceType: WaterSourceType;
    hasSpring: boolean;
    wellDepthMeters: number | null;
    waterAvailability: WaterAvailability;
    salinityIndicator: SalinityIndicator | null;
  };
  soil: {
    soilTexture: SoilTexture;
    infiltrationRateMmPerHour: number;
    compactionLevel: Level;
    erosionSigns: ErosionSigns;
    soilExposedPercent: number | null;
  };
  vegetation: {
    vegetationCoverPercent: number;
    fragmentationLevel: Level;
    hasRiparianApp: boolean | null;
    landscapeDegradation: Level;
  };
  terrain: {
    drainageDensityKmPerKm2: number | null;
    elevationMeters: number | null;
    slopePercent: number | null;
  };
}

export interface EnvironmentalData extends EnvironmentalInput {
  id: string;
  collectionId: string;
  measurementContractVersion: string;
  confirmedAt: string;
  readOnly: boolean;
}

// --- Dashboard / mapa ---
export interface HistoryItem {
  id: string;
  type: "AREA_CREATED" | "COLLECTION_CONFIRMED";
  label: string;
  eventAt: string;
  area: { id: string; name: string };
  destination: string;
  collection?: { id: string };
  occurredAt?: string;
}

export interface TerritorialArea {
  id: string;
  name: string;
  location: { latitude: number; longitude: number } | null;
  confirmedCollections: { id: string; occurredAt: string; confirmedAt: string }[];
}

// --- IHFR ---
export type LandUseType =
  | "FOREST"
  | "AGROFORESTRY"
  | "CROPLAND"
  | "PASTURE"
  | "DEGRADED_PASTURE"
  | "BARE_SOIL"
  | "URBAN";
export type ProvenanceKind = "FIELD_OBSERVATION" | "AUTHORIZED_RECORD";
export type LifecycleState = "CURRENT" | "SUPERSEDED" | "REVOKED";
export type IhfrClass = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type DataQuality = "LOW" | "MEDIUM" | "HIGH";
export type Outcome = "SUCCEEDED" | "INSUFFICIENT_DATA" | "INCOMPATIBLE_VERSION";
export type InsufficiencyReason =
  | "MISSING_ENVIRONMENTAL_DATA"
  | "MISSING_SLOPE_PERCENT"
  | "MISSING_LAND_USE_TYPE"
  | "INSUFFICIENT_DIMENSION";

export interface ContractVersions {
  measurementContractVersion: string;
  inputContractVersion: string;
  mathContractVersion: string;
  algorithmVersion: string;
  contractHash: string;
}

export interface PublicDiagnosis {
  id: string;
  areaId: string;
  collectionId: string;
  environmentalMeasurementSetId: string;
  inputSupplementId: string;
  lifecycleState: LifecycleState;
  rawScore: number;
  displayScore: number;
  ihfrClass: IhfrClass;
  dataQuality: DataQuality;
  componentScores: { W: number; S: number; V: number; T: number };
  decomposition: Record<string, unknown>;
  drivers: ("W" | "S" | "V" | "T")[];
  explanation: string;
  versions: ContractVersions;
  calculatedAt: string;
  validFrom: string;
  transitionedAt: string | null;
  scientificState: "EXPERIMENTAL";
  scientificLabels: string[];
}

export interface DiagnosisRequest {
  mode: "CREATE" | "REPLACE";
  expectedCurrentDiagnosisId?: string | null;
  supplement: {
    inputContractVersion: string;
    landUseType?: LandUseType | null;
    provenance: { kind: ProvenanceKind; observedAt: string };
  };
  versions: Omit<ContractVersions, "inputContractVersion">;
}

export interface OperationResponse {
  outcome: Outcome;
  diagnosis: PublicDiagnosis | null;
  insufficiencyReasons: InsufficiencyReason[];
}

export interface Eligibility {
  eligible: boolean;
  outcome: Outcome;
  reasons: InsufficiencyReason[];
  hasCurrentDiagnosis: boolean;
  currentDiagnosisId: string | null;
}

// --- Administração ---
export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: GlobalRole;
  status: AccountStatus;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  targetUserId: string;
  actorUserId: string;
  action: "ACCOUNT_STATUS_CHANGED" | "GLOBAL_ROLE_CHANGED";
  beforeValue: string;
  afterValue: string;
  reason: string;
  targetRevision: number;
  createdAt: string;
}
