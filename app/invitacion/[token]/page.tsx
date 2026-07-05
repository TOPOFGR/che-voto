import Link from "next/link";
import { getSessionUser, getCurrentUsuario } from "@/lib/session";
import { getInvitacionUsable } from "@/lib/invitaciones";
import { ROLES } from "@/lib/types";
import { RegistroInvitacionForm } from "./registro-form";
import { aceptarInvitacionAction } from "./actions";

export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 bg-gradient-to-b from-brand-50 to-canvas">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-brand-500/30">
            ✔
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Campaña CRM</h1>
          <p className="text-sm text-muted">Gestión territorial de votantes</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export default async function InvitacionPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { token } = await params;
  const { e } = await searchParams;
  const inv = await getInvitacionUsable(token);

  if (!inv) {
    return (
      <Shell>
        <div className="card p-6 text-center">
          <p className="text-lg font-bold text-slate-900">Invitación no válida</p>
          <p className="text-sm text-muted mt-2">
            Este link de invitación no existe, ya fue usado o venció. Pedile a un
            responsable de la campaña que te genere uno nuevo.
          </p>
          <Link href="/auth/sign-in" className="btn-ghost mt-4 inline-block">
            Ir a iniciar sesión
          </Link>
        </div>
      </Shell>
    );
  }

  const rolLabel = ROLES[inv.rol].label;
  const su = await getSessionUser();

  // Header describing the invitation, shared by the logged-in / logged-out views.
  const cabecera = (
    <div className="rounded-xl bg-brand-50 border border-brand-100 p-4 mb-4 text-center">
      <p className="text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{inv.invitado_por}</span> te invitó a
      </p>
      <p className="text-base font-bold text-slate-900 mt-0.5">{inv.campaign_nombre}</p>
      <p className="text-sm text-brand-700 font-medium mt-1">
        Rol: {rolLabel}
      </p>
    </div>
  );

  if (su) {
    const usuario = await getCurrentUsuario();
    if (usuario) {
      return (
        <Shell>
          <div className="card p-6 text-center">
            {cabecera}
            <p className="text-sm text-muted">
              Tu cuenta ya pertenece a la campaña como{" "}
              <span className="font-medium text-slate-700">{ROLES[usuario.rol].label}</span>.
              Una invitación no cambia tu rol.
            </p>
            <Link href="/" className="btn-primary mt-4 inline-block">
              Ir a la campaña
            </Link>
          </div>
        </Shell>
      );
    }

    // Authenticated but not yet a member → one-click accept.
    return (
      <Shell>
        <div className="card p-6">
          {cabecera}
          {e && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{e}</p>
          )}
          <p className="text-sm text-muted text-center mb-4">
            Estás por unirte como <span className="font-medium text-slate-700">{rolLabel}</span>.
          </p>
          <form action={aceptarInvitacionAction}>
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="btn-primary w-full">
              Aceptar invitación
            </button>
          </form>
        </div>
      </Shell>
    );
  }

  // Not authenticated → create the account, then accept.
  return (
    <Shell>
      <div className="card p-6">
        {cabecera}
        <RegistroInvitacionForm
          token={token}
          defaultEmail={inv.email ?? ""}
          defaultNombre={inv.nombre ?? ""}
        />
        <p className="text-sm text-muted text-center mt-5">
          ¿Ya tenés cuenta?{" "}
          <Link
            href={`/auth/sign-in?next=${encodeURIComponent(`/invitacion/${token}`)}`}
            className="font-semibold text-brand-600 hover:underline"
          >
            Iniciá sesión para aceptar
          </Link>
        </p>
      </div>
    </Shell>
  );
}
