import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Inbox, Loader2, Lock, RefreshCw, SearchX, ShieldOff } from "lucide-react";
import { useId, type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ApiError } from "@/adapter";

export function Brand({ className }: { className?: string }) {
  // Wordmark textual TEMPORÁRIO e substituível pela marca oficial.
  return (
    <span className={cn("font-extrabold leading-none tracking-tight", className)} aria-label="HidroFlorestas">
      <span className="text-water-strong">HIDRO</span>
      <span className="text-primary">FLORESTAS</span>
    </span>
  );
}

export function Card({ className, children, as: As = "section", ...rest }: { className?: string; children: ReactNode; as?: "section" | "div" | "article"; "aria-labelledby"?: string }) {
  return (
    <As className={cn("rounded-[20px] bg-card p-5 shadow-[var(--shadow-card)] sm:p-6", className)} {...rest}>
      {children}
    </As>
  );
}

export function PageHeader({ title, subtitle, back, actions, crumbs }: {
  title: string;
  subtitle?: string;
  back?: { to: string; params?: Record<string, string>; label: string };
  actions?: ReactNode;
  crumbs?: { label: string; to?: string; params?: Record<string, string> }[];
}) {
  return (
    <div className="mb-6 space-y-3">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Trilha de navegação" className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1">
            {crumbs.map((c, i) => (
              <li key={i} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden>/</span>}
                {c.to ? (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  <Link to={c.to as any} params={c.params as any} className="underline-offset-4 hover:underline">{c.label}</Link>
                ) : (
                  <span aria-current="page" className="font-medium text-foreground">{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="grid grid-cols-1 gap-4 sm:flex sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {back && (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <Link to={back.to as any} params={back.params as any} aria-label={back.label}
              className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ochre text-primary-foreground hover:bg-ochre/90">
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function LoadingState({ label = "Carregando…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 rounded-[20px] bg-card p-6 text-muted-foreground shadow-[var(--shadow-card)]">
      <Loader2 className="h-5 w-5 animate-spin text-icon" aria-hidden /> {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const e = error instanceof ApiError ? error : null;
  if (e?.status === 404) return <NotFoundState />;
  if (e?.status === 403) return <ForbiddenState />;
  return (
    <div role="alert" className="rounded-[20px] border border-destructive/30 bg-danger-soft p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
        <div className="space-y-3">
          <p className="font-semibold text-destructive">{e?.message ?? "Não foi possível conectar ao servidor."}</p>
          {onRetry && (
            <Button variant="outline" onClick={onRetry}><RefreshCw aria-hidden /> Tentar novamente</Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotFoundState() {
  return (
    <div role="status" className="rounded-[20px] bg-card p-8 text-center shadow-[var(--shadow-card)]">
      <SearchX className="mx-auto h-8 w-8 text-icon" aria-hidden />
      <p className="mt-3 text-lg font-semibold">Recurso não encontrado</p>
      <p className="mt-1 text-sm text-muted-foreground">O conteúdo não existe ou não está disponível para a sua conta.</p>
      <Button asChild variant="outline" className="mt-4"><Link to="/workspace">Voltar ao workspace</Link></Button>
    </div>
  );
}

export function ForbiddenState() {
  return (
    <div role="status" className="rounded-[20px] bg-card p-8 text-center shadow-[var(--shadow-card)]">
      <ShieldOff className="mx-auto h-8 w-8 text-icon" aria-hidden />
      <p className="mt-3 text-lg font-semibold">Permissão insuficiente</p>
      <p className="mt-1 text-sm text-muted-foreground">Sua conta não tem autorização para esta ação ou página.</p>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-dashed border-input bg-card p-8 text-center">
      <Inbox className="mx-auto h-8 w-8 text-icon" aria-hidden />
      <p className="mt-3 text-lg font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ReadOnlyBanner() {
  return (
    <div role="status" className="mb-6 flex items-center gap-3 rounded-[10px] border border-ochre/40 bg-ochre-soft px-4 py-3 text-sm font-medium text-ochre">
      <Lock className="h-4 w-4 shrink-0" aria-hidden /> Laboratório inativo — somente leitura.
    </div>
  );
}

export function Notice({ tone = "info", children, role }: { tone?: "info" | "success" | "warning" | "danger"; children: ReactNode; role?: "status" | "alert" }) {
  const styles = {
    info: "border-water-strong/30 bg-water-soft text-foreground",
    success: "border-primary/30 bg-green-soft text-foreground",
    warning: "border-ochre/40 bg-ochre-soft text-foreground",
    danger: "border-destructive/30 bg-danger-soft text-destructive",
  }[tone];
  return <div role={role} className={cn("rounded-[10px] border px-4 py-3 text-sm", styles)}>{children}</div>;
}

export function StatusBadge({ tone, children }: { tone: "green" | "blue" | "ochre" | "red" | "neutral"; children: ReactNode }) {
  const s = {
    green: "bg-green-soft text-primary border-primary/30",
    blue: "bg-water-soft text-water-strong border-water-strong/30",
    ochre: "bg-ochre-soft text-ochre border-ochre/30",
    red: "bg-danger-soft text-destructive border-destructive/30",
    neutral: "bg-secondary text-foreground border-input",
  }[tone];
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", s)}>{children}</span>;
}

export function DemoTag({ children = "Demonstração" }: { children?: ReactNode }) {
  return <span className="inline-flex items-center rounded-full border border-dashed border-ochre px-2 py-0.5 text-xs font-semibold text-ochre">{children}</span>;
}

// ---------------- Campos ----------------
interface FieldProps { label: string; hint?: string; error?: string; required?: boolean; unit?: string }

function FieldShell({ id, label, hint, error, required, unit, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-foreground">
        {label}{unit && <span className="font-normal text-muted-foreground"> ({unit})</span>}
        {required ? <span className="text-destructive" aria-hidden> *</span> : <span className="font-normal text-muted-foreground"> — opcional</span>}
      </label>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
      {children}
      {error && <p id={`${id}-err`} className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}
const described = (id: string, hint?: string, error?: string) =>
  [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(" ") || undefined;

const controlCls = "w-full min-h-11 rounded-[10px] border border-input bg-secondary px-3 py-2 text-base text-foreground placeholder:text-muted-foreground aria-[invalid=true]:border-destructive";

export function TextField({ label, hint, error, required, unit, id: idProp, ...rest }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} unit={unit}>
      <input id={id} className={controlCls} aria-invalid={!!error} aria-required={required} aria-describedby={described(id, hint, error)} {...rest} />
    </FieldShell>
  );
}

export function TextAreaField({ label, hint, error, required, id: idProp, ...rest }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <textarea id={id} rows={4} className={controlCls} aria-invalid={!!error} aria-describedby={described(id, hint, error)} {...rest} />
    </FieldShell>
  );
}

export function SelectField({ label, hint, error, required, unit, id: idProp, options, placeholder = "Selecione…", ...rest }: FieldProps & SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; placeholder?: string }) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} unit={unit}>
      <select id={id} className={controlCls} aria-invalid={!!error} aria-required={required} aria-describedby={described(id, hint, error)} {...rest}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </FieldShell>
  );
}

/** Foca o primeiro campo inválido de um formulário. */
export function focusFirstInvalid(form: HTMLElement | null) {
  setTimeout(() => form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
}

export function DefRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-border py-2.5 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold text-foreground sm:text-right">{children}</dd>
    </div>
  );
}

export const NotInformed = () => <span className="font-normal italic text-muted-foreground">Não informado</span>;
