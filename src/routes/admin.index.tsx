// Composição adaptada de screenshot-show-off-18/src/routes/admin.tsx.
import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, History } from "lucide-react";
import { Card, DemoTag, Notice, PageHeader } from "@/components/hf/primitives";
import { Button } from "@/components/ui/button";
import { labHead } from "@/features/lab/useLab";
export const Route = createFileRoute("/admin/")({
  head: labHead("Administração", "Gestão global de contas sintéticas com auditoria."),
  component: AdminHome,
});
function AdminHome() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Administração"
        subtitle="Gestão global de contas da plataforma."
        actions={<DemoTag />}
      />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="space-y-4">
          <Users className="h-8 w-8 text-water-strong" aria-hidden />
          <h2 className="text-xl font-semibold">Contas e permissões</h2>
          <p className="text-sm text-muted-foreground">
            Busque uma conta, consulte seu estado e revise alterações de papel ou estado com
            justificativa.
          </p>
          <Button asChild>
            <Link to="/admin/users">Gerenciar contas</Link>
          </Button>
        </Card>
        <Card className="space-y-4">
          <History className="h-8 w-8 text-ochre" aria-hidden />
          <h2 className="text-xl font-semibold">Alterações rastreáveis</h2>
          <p className="text-sm text-muted-foreground">
            O detalhe de cada conta mostra sua revisão e auditoria. Conflitos exigem uma nova
            revisão antes de confirmar.
          </p>
        </Card>
      </div>
      <Notice>
        A administração global não concede acesso automático aos laboratórios. Escolha um
        laboratório no workspace quando houver vínculo.
      </Notice>
      <Button asChild variant="outline">
        <Link to="/workspace">Voltar ao workspace</Link>
      </Button>
    </div>
  );
}
