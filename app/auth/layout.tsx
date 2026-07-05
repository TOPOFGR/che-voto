export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
