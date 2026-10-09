// Estado da DEMONSTRAÇÃO. Removível: nada do produto depende deste módulo além do adapter mock e do painel.
import { useSyncExternalStore } from "react";

export type GeoMode = "success" | "denied" | "timeout" | "late";
export type IhfrMode = "AUTO" | "INSUFFICIENT_DATA" | "INCOMPATIBLE_VERSION" | "UNKNOWN";

export interface Scenario {
  sessionUserId: string | null;
  latency: "normal" | "slow";
  failReads: boolean;
  failLogout: boolean;
  geo: GeoMode;
  tilesFail: boolean;
  ihfr: IhfrMode;
  adminConflict: boolean;
  unknownEnvironmental: boolean;
}

const KEY = "hf-demo-scenario"; // guarda só a escolha de cenário, nunca senhas ou tokens

const initial: Scenario = {
  sessionUserId: null,
  latency: "normal",
  failReads: false,
  failLogout: false,
  geo: "success",
  tilesFail: false,
  ihfr: "AUTO",
  adminConflict: false,
  unknownEnvironmental: false,
};

let state: Scenario = initial;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw) state = { ...initial, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
}

export function getScenario(): Scenario {
  load();
  return state;
}

export function setScenario(patch: Partial<Scenario>) {
  load();
  state = { ...state, ...patch };
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useScenario(): Scenario {
  return useSyncExternalStore(subscribe, getScenario, () => initial);
}
