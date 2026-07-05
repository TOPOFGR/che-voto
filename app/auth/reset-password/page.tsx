import Link from "next/link";
import { ResetPasswordForm } from "./form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="card p-6 text-center">
        <h2 className="text-lg font-bold text-slate-900">Enlace incompleto</h2>
        <p className="text-sm text-muted mt-2">
          Este enlace de recuperación no es válido. Volvé a pedir uno desde
          “Recuperar contraseña”.
        </p>
        <Link href="/auth/forgot-password" className="btn-primary mt-4 inline-block">
          Recuperar contraseña
        </Link>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold text-slate-900 mb-1">Nueva contraseña</h2>
      <p className="text-sm text-muted mb-5">
        Elegí una contraseña nueva para tu cuenta.
      </p>
      <ResetPasswordForm token={token} />
    </div>
  );
}
