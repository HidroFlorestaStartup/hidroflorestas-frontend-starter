/** Converte decimal digitado em pt-BR ("9,4") ou com ponto ("9.4") para número finito. Vazio → null. */
export function parseDecimal(raw: string): number | null {
  const s = raw.trim();
  if (s === "") return null;
  if (!/^-?\d+([.,]\d+)?$/.test(s)) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
