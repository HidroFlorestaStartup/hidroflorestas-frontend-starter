import { Link, Navigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, LayoutDashboard, LogOut, Map, MapPinned, ShieldCheck, Users } from "lucide-react";
import type { ReactNode } from "react";
import { api } from "@/adapter";
import { initials, labRoleLabel } from "@/domain/labels";
import { useSession } from "@/hooks/use-session";
import { Brand, LoadingState } from "./primitives";

interface NavItem { to: string; label: string; icon: typeof Map; exact?: boolean }

/** Moldura autenticada. Sem sessão leva ao login sem revelar recursos. */
export function AppShell({ children, requireGlobalAdmin }: { children: ReactNode; requireGlobalAdmin?: boolean }) {
  const { status, session } = useSession();
  const params = useParams({ strict: false }) as { laboratoryId?: string };
  const labId = params.laboratoryId;
  const lab = useQuery({ queryKey: ["lab", labId], queryFn: () => api.getLaboratory(labId!), enabled: !!labId && status === "ready" });

  if (status === "pending") return <div className="p-6"><LoadingState label="Verificando sessão…" /></div>;
  if (status !== "ready" || !session) return <Navigate to="/login" />;

  const ctx = lab.data?.context;
  const base = labId ? `/dashboard/laboratories/${labId}` : "";
  const items: NavItem[] = labId
    ? [
        { to: base, label: "Resumo", icon: LayoutDashboard, exact: true },
        { to: `${base}/areas`, label: "Áreas", icon: MapPinned },
        { to: `${base}/map`, label: "Mapa", icon: Map },
        ...(ctx?.membershipRole === "OWNER" ? [{ to: `${base}/members`, label: "Membros", icon: Users }] : []),
      ]
    : [{ to: "/workspace", label: "Workspace", icon: Building2 }];
  if (session.isGlobalAdmin) items.push({ to: "/admin", label: "Admin.", icon: ShieldCheck });
  const name = `${session.user.firstName} ${session.user.lastName}`;

  return (
    <div className="min-h-screen bg-background">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-[10px] focus:bg-card focus:p-3">Pular para o conteúdo</a>
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/workspace" className="shrink-0 text-lg sm:text-xl" aria-label="HidroFlorestas — ir ao workspace"><Brand /></Link>
            {labId && ctx && (
              <Link to="/workspace" className="hidden min-w-0 items-center gap-2 rounded-[10px] border border-border px-3 py-1.5 text-sm md:flex" title="Trocar de laboratório">
                <Building2 className="h-4 w-4 shrink-0 text-icon" aria-hidden />
                <span className="truncate font-medium">{ctx.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">· {labRoleLabel[ctx.membershipRole]}</span>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{name}</p>
              <p className="text-xs text-primary">{session.isGlobalAdmin ? "Administração global" : "Ambiente de Análise"}</p>
            </div>
            <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-sm font-bold text-muted-foreground">
              {initials(session.user.firstName, session.user.lastName)}
            </span>
          </div>
        </div>
        {labId && ctx && (
          <div className="border-t border-border px-4 py-2 text-sm md:hidden">
            <Link to="/workspace" className="flex min-h-11 items-center gap-2"><Building2 className="h-4 w-4 text-icon" aria-hidden /><span className="truncate font-medium">{ctx.name}</span><span className="text-xs text-muted-foreground">(trocar)</span></Link>
          </div>
        )}
      </header>

      <div className="flex">
        <nav aria-label="Navegação principal" className="sticky top-[69px] hidden h-[calc(100vh-69px)] w-28 shrink-0 flex-col justify-between border-r border-border bg-card p-3 md:flex">
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.to}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Link to={it.to as any} activeOptions={{ exact: it.exact }}
                  className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[10px] px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground">
                  <it.icon className="h-5 w-5" aria-hidden /> {it.label}
                </Link>
              </li>
            ))}
            {labId && (
              <li><Link to="/workspace" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[10px] px-2 text-xs font-medium text-muted-foreground hover:bg-secondary"><Building2 className="h-5 w-5" aria-hidden /> Workspace</Link></li>
            )}
          </ul>
          <Link to="/logout" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[10px] bg-ochre text-xs font-semibold text-primary-foreground hover:bg-ochre/90">
            <LogOut className="h-5 w-5" aria-hidden /> Sair
          </Link>
        </nav>

        <main id="conteudo" className="min-w-0 flex-1 px-4 pb-32 pt-6 sm:px-6 md:pb-12 lg:px-10">
          <div className="mx-auto max-w-6xl">
            {requireGlobalAdmin && !session.isGlobalAdmin ? (
              <div role="status" className="rounded-[20px] bg-card p-8 text-center shadow-[var(--shadow-card)]">
                <p className="text-lg font-semibold">Permissão insuficiente</p>
                <p className="mt-1 text-sm text-muted-foreground">Somente administradores globais acessam esta área.</p>
              </div>
            ) : children}
          </div>
        </main>
      </div>

      <nav aria-label="Navegação principal (celular)" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card md:hidden">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length + 1}, minmax(0, 1fr))` }}>
          {items.map((it) => (
            <li key={it.to}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Link to={it.to as any} activeOptions={{ exact: it.exact }}
                className="flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground data-[status=active]:text-primary">
                <it.icon className="h-5 w-5" aria-hidden /> {it.label}
              </Link>
            </li>
          ))}
          <li>
            <Link to="/logout" className="flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-ochre">
              <LogOut className="h-5 w-5" aria-hidden /> Sair
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
