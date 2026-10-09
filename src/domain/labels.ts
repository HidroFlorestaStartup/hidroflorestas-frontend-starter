// Rótulos de apresentação em pt-BR. O transporte usa sempre os valores técnicos.
import type {
  AccountStatus,
  DataQuality,
  ErosionSigns,
  GlobalRole,
  IhfrClass,
  InsufficiencyReason,
  LabRole,
  LabStatus,
  LandUseType,
  Level,
  LifecycleState,
  ProvenanceKind,
  SalinityIndicator,
  SoilTexture,
  WaterAvailability,
  WaterSourceType,
} from "./types";

export const IHFR_VERSIONS = {
  measurementContractVersion: "ihfr-measurement-v1",
  inputContractVersion: "ihfr-diagnosis-input-experimental-v0.1.0",
  mathContractVersion: "ihfr-math-experimental-v0.1.1",
  algorithmVersion: "ihfr-evaluator-ts-v0.1.0",
  contractHash: "sha256:f8104143f1505aceaa68a7ffa06fac50f4906cdfc4119609875d99c9fecc6f89",
} as const;

export const SCIENTIFIC_LABELS = [
  "CONTRATO_EXPERIMENTAL",
  "VALIDACAO_CIENTIFICA_PENDENTE",
  "SUJEITO_A_RECALIBRACAO",
  "NAO_APROVADO_COMO_CONTRATO_CIENTIFICO_DEFINITIVO",
];

export const SCIENTIFIC_NOTICE =
  "Validação científica pendente; sujeito a recalibração; não aprovado como contrato científico definitivo";

export const globalRoleLabel: Record<GlobalRole, string> = {
  USER: "Usuário",
  ADMIN: "Administrador global",
  DEVELOPER: "Desenvolvedor",
  MODERATOR: "Moderador",
};
export const accountStatusLabel: Record<AccountStatus, string> = {
  ACTIVE: "Ativa",
  PENDING: "Pendente",
  INACTIVE: "Inativa",
  BLOCKED: "Bloqueada",
};
export const labRoleLabel: Record<LabRole, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador do laboratório",
  MEMBER: "Membro",
};
export const labStatusLabel: Record<LabStatus, string> = { ACTIVE: "Ativo", INACTIVE: "Inativo" };

export const waterSourceLabel: Record<WaterSourceType, string> = {
  RIVER_STREAM: "Rio ou riacho",
  SPRING: "Nascente",
  SHALLOW_WELL: "Poço raso",
  TUBULAR_WELL: "Poço tubular",
  CISTERN: "Cisterna",
  OTHER: "Outra",
};
export const waterAvailabilityLabel: Record<WaterAvailability, string> = {
  PERMANENT: "Permanente",
  SEASONAL: "Sazonal",
  SCARCE: "Escassa",
};
export const salinityLabel: Record<SalinityIndicator, string> = {
  NONE: "Nenhum",
  SUSPECTED: "Suspeita",
  CONFIRMED: "Confirmada",
};
export const soilTextureLabel: Record<SoilTexture, string> = {
  SANDY: "Arenosa",
  MEDIUM: "Média",
  CLAYEY: "Argilosa",
};
export const levelLabel: Record<Level, string> = { LOW: "Baixo", MEDIUM: "Médio", HIGH: "Alto" };
export const levelLabelF: Record<Level, string> = { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta" };
export const erosionLabel: Record<ErosionSigns, string> = {
  NONE: "Nenhum",
  LAMINAR: "Laminar",
  RILLS_GULLIES: "Sulcos ou ravinas",
};

export const landUseLabel: Record<LandUseType, string> = {
  FOREST: "Floresta",
  AGROFORESTRY: "Sistema agroflorestal (SAF)",
  CROPLAND: "Agricultura",
  PASTURE: "Pastagem",
  DEGRADED_PASTURE: "Pastagem degradada",
  BARE_SOIL: "Solo exposto",
  URBAN: "Área urbanizada",
};
export const provenanceLabel: Record<ProvenanceKind, string> = {
  FIELD_OBSERVATION: "Observação em campo",
  AUTHORIZED_RECORD: "Registro autorizado",
};
export const lifecycleLabel: Record<LifecycleState, string> = {
  CURRENT: "Vigente",
  SUPERSEDED: "Substituído",
  REVOKED: "Revogado",
};
export const ihfrClassLabel: Record<IhfrClass, string> = {
  LOW: "Baixo",
  MODERATE: "Moderado",
  HIGH: "Alto",
  CRITICAL: "Crítico",
};
export const dataQualityLabel: Record<DataQuality, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
};
export const insufficiencyLabel: Record<InsufficiencyReason, string> = {
  MISSING_ENVIRONMENTAL_DATA: "Não há conjunto de dados ambientais confirmado para esta coleta.",
  MISSING_SLOPE_PERCENT: "A declividade (%) não foi informada nos dados ambientais confirmados.",
  MISSING_LAND_USE_TYPE: "O uso predominante da terra não foi informado (indeterminado ou ausente).",
  INSUFFICIENT_DIMENSION:
    "Alguma dimensão (Água, Solo, Vegetação ou Território) não tem ao menos dois scores disponíveis.",
};
export const componentLabel = { W: "Água", S: "Solo", V: "Vegetação", T: "Território" } as const;

export const fmtDecimal = (n: number, digits?: number) =>
  n.toLocaleString("pt-BR", digits === undefined ? { maximumFractionDigits: 6 } : {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const initials = (first: string, last: string) =>
  `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
