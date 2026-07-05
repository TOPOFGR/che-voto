import { redirect } from "next/navigation";
import { getSessionUser, getCurrentUsuario } from "@/lib/session";
import { signOut } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const su = await getSessionUser();
  if (!su) redirect("/auth/sign-in");

  // Already a member → into the app.
  const existing = await getCurrentUsuario();
  if (existing) redirect("/");

  // Authenticated but not part of any campaign: access is invitation-only, so
  // there's no self-service role picker anymore — they need an invite link.
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 bg-gradient-to-b from-brand-50 to-canvas">
      <div className="w-full max-w-md">
        <div className="card p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xl mb-3 mx-auto">
            !
          </div>
          <p className="text-lg font-bold text-slate-900">Tu cuenta no tiene acceso todavía</p>
          <p className="text-sm text-muted mt-2">
            El ingreso a la campaña es solo por invitación. Pedile a un responsable
            (jefe de campaña o coordinador) que te comparta un link de invitación.
            Si ya lo tenés, abrilo desde el navegador con esta misma cuenta
            {su.email ? ` (${su.email})` : ""}.
          </p>
          <form action={signOut} className="mt-5">
            <button type="submit" className="btn-ghost">
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
