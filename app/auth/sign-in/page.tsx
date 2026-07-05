import { SignInForm } from "./form";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const { next, reset } = await searchParams;

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold text-slate-900 mb-5">Iniciar sesión</h2>
      {reset && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 mb-4">
          Tu contraseña se actualizó. Ingresá con la nueva.
        </p>
      )}
      <SignInForm next={next} />
      <p className="text-xs text-muted text-center mt-5">
        El acceso es solo por invitación. Si te invitaron, abrí el link que te
        compartieron para crear tu cuenta.
      </p>
    </div>
  );
}
