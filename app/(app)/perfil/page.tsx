import { requireUsuario } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { RolBadge } from "@/components/badges";
import { PerfilForm } from "./perfil-form";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const usuario = await requireUsuario();

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title="Mi perfil"
        subtitle="Editá tu nombre y tu foto de perfil."
        action={<RolBadge rol={usuario.rol} />}
      />

      {usuario.campaign_nombre && (
        <p className="text-sm text-muted mb-4">
          Campaña: <span className="text-slate-700 font-medium">{usuario.campaign_nombre}</span>
        </p>
      )}

      <PerfilForm usuario={usuario} />
    </div>
  );
}
