import { requireUsuario } from "@/lib/session";
import { getActiveCampaign } from "@/lib/queries";
import { RolBadge } from "@/components/badges";
import { TopNav, BottomNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await requireUsuario();
  const campaign = await getActiveCampaign();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-[var(--color-line)]">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center text-sm font-bold">
              ✔
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-900">Campaña CRM</p>
              {campaign && (
                <p className="text-[11px] text-muted -mt-0.5 max-w-[150px] truncate">
                  {campaign.nombre}
                </p>
              )}
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <TopNav />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-sm font-medium text-slate-800 max-w-[140px] truncate">
                {usuario.nombre}
              </span>
              <RolBadge rol={usuario.rol} />
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5 pb-24 md:pb-8">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
