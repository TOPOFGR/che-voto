import { ChevotoMark } from "@/components/icons";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 bg-gradient-to-b from-brand-50 to-canvas">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <ChevotoMark className="w-14 h-14 drop-shadow-lg" />
          <h1 className="mt-4 text-xl font-extrabold tracking-tight text-slate-900">
            Che<span className="text-brand-600">Voto</span>
          </h1>
          <p className="text-sm text-muted">Captación territorial de votantes</p>
        </div>
        {children}
      </div>
    </div>
  );
}
