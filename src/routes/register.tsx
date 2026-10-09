import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "@/adapter";
import { Button } from "@/components/ui/button";
import { Brand, focusFirstInvalid, Notice, TextField } from "@/components/hf/primitives";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Criar conta — HidroFlorestas" },
      { name: "description", content: "Crie sua conta para registrar monitoramentos ambientais." },
      { property: "og:title", content: "Criar conta — HidroFlorestas" },
      { property: "og:description", content: "Crie sua conta HidroFlorestas." },
    ],
  }),
  component: Register,
});

type F = { firstName: string; lastName: string; email: string; password: string };

function Register() {
  const [f, setF] = useState<F>({ firstName: "", lastName: "", email: "", password: "" });
  const [errors, setErrors] = useState<Partial<F>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const set = (k: keyof F) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Partial<F> = {};
    if (!f.firstName.trim()) errs.firstName = "Campo obrigatório.";
    if (!f.lastName.trim()) errs.lastName = "Campo obrigatório.";
    if (!f.email.trim()) errs.email = "Campo obrigatório.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) errs.email = "Informe um e-mail válido.";
    if (!f.password) errs.password = "Campo obrigatório.";
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) return focusFirstInvalid(ref.current);
    setBusy(true);
    try {
      await api.signUp(f);
      qc.clear();
      navigate({ to: "/workspace" });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Não foi possível conectar ao servidor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-[linear-gradient(180deg,var(--water-soft),oklch(0.965_0_0))] p-12 lg:flex" aria-hidden>
        <Brand className="text-3xl" />
        <div className="max-w-md space-y-4">
          <p className="text-3xl font-bold leading-snug text-foreground">Água, solo, vegetação e território em um só registro.</p>
          <p className="text-muted-foreground">Crie sua conta para participar de um laboratório de monitoramento.</p>
        </div>
        <span />
      </aside>
      <div className="grid place-items-center px-4 py-10">
        <div className="w-full max-w-[500px] rounded-[20px] bg-card p-6 shadow-[var(--shadow-card)] sm:p-10">
          <Brand className="text-2xl lg:hidden" />
          <h1 className="mt-4 text-2xl font-bold text-ochre-signup lg:mt-0">Criar conta</h1>
          <form ref={ref} onSubmit={submit} noValidate className="mt-6 space-y-4">
            {formError && <Notice tone="danger" role="alert">{formError}</Notice>}
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Nome" required autoComplete="given-name" value={f.firstName} onChange={set("firstName")} error={errors.firstName} />
              <TextField label="Sobrenome" required autoComplete="family-name" value={f.lastName} onChange={set("lastName")} error={errors.lastName} />
            </div>
            <TextField label="E-mail" type="email" required autoComplete="email" value={f.email} onChange={set("email")} error={errors.email} />
            <div className="relative">
              <TextField label="Senha" type={show ? "text" : "password"} required autoComplete="new-password" value={f.password} onChange={set("password")} error={errors.password} className="w-full min-h-11 rounded-[10px] border border-input bg-secondary py-2 pl-3 pr-12 text-base aria-[invalid=true]:border-destructive" />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Ocultar senha" : "Mostrar senha"} aria-pressed={show}
                className="absolute right-0 top-[26px] grid h-11 w-11 place-items-center text-icon hover:text-foreground">
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden />} {busy ? "Criando conta…" : "Criar conta"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm">Já tem conta? <Link to="/login" className="font-semibold text-ochre-signup underline underline-offset-4">Voltar ao login</Link></p>
        </div>
      </div>
    </main>
  );
}
