// Utilitários de data/hora para `occurredAt` (RFC3339 com offset explícito).
// Nunca anexa "Z" a uma hora local: o offset é sempre declarado.

export interface LocalParts {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM, HH:MM:SS ou HH:MM:SS.mmm
}

const pad = (n: number, w = 2) => String(Math.abs(n)).padStart(w, "0");

/** Valida offset "+HH:MM"/"-HH:MM" ou "Z". Retorna minutos ou null. */
export function parseOffset(raw: string): number | null {
  const s = raw.trim();
  if (s === "Z") return 0;
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[2]);
  const min = Number(m[3]);
  if (min > 59 || h > 14) return null;
  if (h === 14 && min !== 0) return null;
  if (m[1] === "-" && h === 0 && min === 0) return null; // -00:00 inválido
  return (m[1] === "-" ? -1 : 1) * (h * 60 + min);
}

export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  return `${sign}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}`;
}

interface Wall {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
  s: number;
  ms: number;
  secPart: string; // texto original de segundos/milissegundos preservado
}

export function parseWall({ date, time }: LocalParts): Wall | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const tm = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(time);
  if (!dm || !tm) return null;
  const y = +dm[1], mo = +dm[2], d = +dm[3];
  const h = +tm[1], mi = +tm[2], s = tm[3] ? +tm[3] : 0;
  const msText = tm[4] ?? "";
  const ms = msText ? Number(msText.padEnd(3, "0")) : 0;
  if (mo < 1 || mo > 12 || d < 1 || h > 23 || mi > 59 || s > 59) return null;
  const dim = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  if (d > dim) return null;
  const secPart = `${pad(s)}${msText ? "." + msText.padEnd(3, "0") : ""}`;
  return { y, mo, d, h, mi, s, ms, secPart };
}

const wallAsUtc = (w: Wall) => Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s, w.ms);

export function buildRfc3339(parts: LocalParts, offset: string): string | null {
  const w = parseWall(parts);
  const off = parseOffset(offset);
  if (!w || off === null) return null;
  const offText = offset.trim() === "Z" ? "Z" : offset.trim();
  return `${pad(w.y, 4)}-${pad(w.mo)}-${pad(w.d)}T${pad(w.h)}:${pad(w.mi)}:${w.secPart}${offText}`;
}

/** Instante (ms epoch) de um RFC3339 com offset. */
export function rfcToEpoch(rfc: string): number | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)(Z|[+-]\d{2}:\d{2})$/.exec(rfc);
  if (!m) return null;
  const w = parseWall({ date: m[1], time: m[2] });
  const off = parseOffset(m[3]);
  if (!w || off === null) return null;
  return wallAsUtc(w) - off * 60000;
}

export function toUtcIso(rfc: string): string | null {
  const e = rfcToEpoch(rfc);
  return e === null ? null : new Date(e).toISOString();
}

/** Exibe a ocorrência na hora local declarada, preservando o offset original. */
export function displayDeclared(rfc: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2}:\d{2}(?:\.\d+)?)(Z|[+-]\d{2}:\d{2})$/.exec(rfc);
  if (!m) return rfc;
  const off = m[5] === "Z" ? "UTC" : `UTC${m[5]}`;
  return `${m[3]}/${m[2]}/${m[1]} às ${m[4]} (${off})`;
}

/** Offset (minutos) de um fuso IANA em determinado instante. */
export function offsetAt(epoch: number, timeZone: string): number {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(new Date(epoch)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - Math.floor(epoch / 1000) * 1000) / 60000);
}

/**
 * Resolve uma hora local em um fuso IANA.
 * - "ok": um único offset
 * - "gap": hora inexistente (transição sazonal) — não corrigir silenciosamente
 * - "ambiguous": hora repetida — exige escolha explícita do offset
 */
export function resolveZoned(
  parts: LocalParts,
  timeZone: string,
): { kind: "ok"; offset: string } | { kind: "gap" } | { kind: "ambiguous"; offsets: string[] } | { kind: "invalid" } {
  const w = parseWall(parts);
  if (!w) return { kind: "invalid" };
  const base = wallAsUtc(w);
  const cands = new Set([offsetAt(base - 86400000, timeZone), offsetAt(base + 86400000, timeZone), offsetAt(base, timeZone)]);
  const valid = [...cands].filter((o) => offsetAt(base - o * 60000, timeZone) === o);
  if (valid.length === 0) return { kind: "gap" };
  if (valid.length > 1) return { kind: "ambiguous", offsets: valid.sort((a, b) => b - a).map(formatOffset) };
  return { kind: "ok", offset: formatOffset(valid[0]) };
}

/** Partes locais do dispositivo para o momento atual (inicialização única). */
export function nowLocalParts(d = new Date()): LocalParts {
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`,
  };
}

export const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
