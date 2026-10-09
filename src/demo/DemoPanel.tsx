// Painel exclusivo da DEMONSTRAÇÃO. Para remover: apague este arquivo e seu uso em __root.tsx.
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { FlaskConical, X } from "lucide-react";
import { useState } from "react";
import { demoPersonas } from "@/adapter/mock";
import { setScenario, useScenario, type GeoMode, type IhfrMode } from "./scenario";

export function DemoPanel() {
  const [open, setOpen] = useState(false);
  const s = useScenario();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const sel = "w-full min-h-11 rounded-[10px] border border-input bg-secondary px-3 text-sm";
  const toggle = (label: string, key: "failReads" | "failLogout" | "tilesFail" | "adminConflict" | "unknownEnvironmental") => (
    <label className="flex min-h-11 items-center gap-3 text-sm">
      <input type="checkbox" className="h-5 w-5 accent-[var(--ochre)]" checked={s[key]} onChange={(e) => { setScenario({ [key]: e.target.checked }); qc.invalidateQueries(); }} />
      {label}
    </label>
  );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
        className="fixed bottom-20 right-3 z-40 flex min-h-11 items-center gap-2 rounded-full border-2 border-dashed border-ochre bg-card px-4 text-sm font-semibold text-ochre shadow-[var(--shadow-card)] md:bottom-4">
        <FlaskConical className="h-4 w-4" aria-hidden /> Demonstração
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="demo-title" className="fixed inset-0 z-50 flex justify-end bg-foreground/30"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="h-full w-full max-w-sm space-y-5 overflow-y-auto bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <h2 id="demo-title" className="text-lg font-bold text-ochre">Cenários de demonstração</h2>
              <button autoFocus type="button" onClick={() => setOpen(false)} aria-label="Fechar painel" className="grid h-11 w-11 place-items-center rounded-[10px] hover:bg-secondary"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-xs text-muted-foreground">Dados totalmente sintéticos. Nenhuma conta real é autenticada; nada aqui faz parte do produto.</p>

            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Sessão fictícia</legend>
              {demoPersonas.map((p) => (
                <button key={p.id} type="button"
                  onClick={() => { setScenario({ sessionUserId: p.id }); qc.clear(); setOpen(false); navigate({ to: p.id === "u-global" ? "/admin" : "/workspace" }); }}
                  className={`block w-full rounded-[10px] border px-3 py-2 text-left text-sm ${s.sessionUserId === p.id ? "border-primary bg-green-soft" : "border-border hover:bg-secondary"}`}>
                  <span className="block font-semibold">{p.label}</span>
                  <span className="block text-xs text-muted-foreground">{p.hint} · {p.email}</span>
                </button>
              ))}
              <button type="button" className="text-sm text-water-strong underline min-h-11" onClick={() => { setScenario({ sessionUserId: null }); qc.clear(); navigate({ to: "/login" }); }}>
                Simular sessão expirada
              </button>
            </fieldset>

            <fieldset className="space-y-1">
              <legend className="text-sm font-semibold">Rede e falhas</legend>
              <label className="block text-sm">Latência
                <select className={sel} value={s.latency} onChange={(e) => setScenario({ latency: e.target.value as "normal" | "slow" })}>
                  <option value="normal">Normal</option><option value="slow">Lenta (≈1,6 s)</option>
                </select>
              </label>
              {toggle("Falhar leituras (erro com repetir)", "failReads")}
              {toggle("Falhar ao sair", "failLogout")}
              {toggle("Mapa (tiles) indisponível", "tilesFail")}
              {toggle("Conflito administrativo na próxima alteração", "adminConflict")}
              {toggle("Resultado desconhecido ao confirmar medições", "unknownEnvironmental")}
            </fieldset>

            <label className="block text-sm font-semibold">Localização do dispositivo
              <select className={sel} value={s.geo} onChange={(e) => setScenario({ geo: e.target.value as GeoMode })}>
                <option value="success">Concedida</option><option value="denied">Negada</option>
                <option value="timeout">Tempo esgotado</option><option value="late">Retorno tardio (4 s)</option>
              </select>
            </label>

            <label className="block text-sm font-semibold">Próxima tentativa IHFR
              <select className={sel} value={s.ihfr} onChange={(e) => setScenario({ ihfr: e.target.value as IhfrMode })}>
                <option value="AUTO">Conforme os dados (fixture)</option>
                <option value="INSUFFICIENT_DATA">Forçar dados insuficientes</option>
                <option value="INCOMPATIBLE_VERSION">Forçar versão incompatível</option>
                <option value="UNKNOWN">Resultado desconhecido (falha de rede)</option>
              </select>
            </label>
          </div>
        </div>
      )}
    </>
  );
}
