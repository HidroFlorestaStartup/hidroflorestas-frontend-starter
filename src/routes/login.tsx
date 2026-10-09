import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "@/adapter";
import { demoPersonas } from "@/adapter/mock";
import { Button } from "@/components/ui/button";
import { Brand, DemoTag, focusFirstInvalid, Notice, TextField } from "@/components/hf/primitives";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — HidroFlorestas" },
      { name: "description", content: "Acesse sua conta HidroFlorestas." },
      { property: "og:title", content: "Entrar — HidroFlorestas" },
      { property: "og:description", content: "Acesse sua conta HidroFlorestas." },
    ],
  }),
  component: Login,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!email.trim()) errs.email = "Campo obrigatório.";
    else if (!EMAIL_RE.test(email.trim())) errs.email = "Informe um e-mail válido.";
    if (password.length === 0) errs.password = "Campo obrigatório."; // sem trim na senha
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) return focusFirstInvalid(formRef.current);
    setBusy(true);
    try {
      const r = await api.signIn({ email, password });
      qc.clear();
      navigate({ to: r.destination === "/admin" ? "/admin" : "/workspace" });
    } catch (err) {
      setFormError(err instanceof ApiError && err.status === 401 ? "Email ou senha inválidos." : "Não foi possível conectar ao servidor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-[500px] space-y-4">
        <div className="rounded-[20px] bg-card p-6 shadow-[var(--shadow-card)] sm:p-10">
          <Brand className="text-2xl" />
          <h1 className="mt-6 text-2xl font-bold text-ochre">Entrar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesse o ambiente de análises com seu e-mail.</p>
          <form ref={formRef} onSubmit={submit} noValidate className="mt-6 space-y-4">
            {formError && <Notice tone="danger" role="alert">{formError}</Notice>}
            <TextField label="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
            <div className="relative">
              <TextField label="Senha" type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} className="w-full min-h-11 rounded-[10px] border border-input bg-secondary py-2 pl-3 pr-12 text-base aria-[invalid=true]:border-destructive" />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Ocultar senha" : "Mostrar senha"} aria-pressed={show}
                className="absolute right-0 top-[26px] grid h-11 w-11 place-items-center text-icon hover:text-foreground">
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden />} {busy ? "Entrando…" : "Entrar"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm">Ainda não tem conta? <Link to="/register" className="font-semibold text-ochre underline underline-offset-4">Criar conta</Link></p>
        </div>
        <div className="rounded-[20px] border border-dashed border-ochre/60 bg-card p-4 text-sm">
          <DemoTag />
          <p className="mt-2 text-muted-foreground">Contas fictícias: use qualquer senha não vazia.</p>
          <ul className="mt-2 space-y-1">
            {demoPersonas.map((p) => (
              <li key={p.id}>
                <button type="button" className="min-h-11 text-left text-water-strong underline underline-offset-2" onClick={() => { setEmail(p.email); setPassword("demo"); }}>
                  {p.label}
                </button>
              </li>
            ))}
            <li className="text-xs text-muted-foreground">Conta bloqueada (mensagem genérica): rafael@demo.hidroflorestas.org</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
