import Link from "next/link";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-muted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  cta,
}: {
  title: string;
  description: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="card p-8 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center text-xl mb-3">
        ◎
      </div>
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="text-sm text-muted mt-1 max-w-xs">{description}</p>
      {cta && (
        <Link href={cta.href} className="btn-primary mt-4">
          {cta.label}
        </Link>
      )}
    </div>
  );
}
