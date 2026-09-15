import Link from "next/link";
import { requireUsuario } from "@/lib/session";
import { getEventos } from "@/lib/eventos";
import { formatearFechaEvento } from "@/lib/eventos-config";
import { PageHeader, EmptyState } from "@/components/ui";
import { CalendarioIcon } from "@/components/icons";
import { ROLES_QUE_CREAN_EVENTOS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EventosPage() {
  const usuario = await requireUsuario();

  if (!ROLES_QUE_CREAN_EVENTOS.includes(usuario.rol)) {
    return (
      <div>
        <PageHeader title="Eventos" />
        <EmptyState
          title="Sin acceso a eventos"
          description="Los eventos los crean intendentes y concejales."
          icon={<CalendarioIcon className="w-6 h-6" />}
        />
      </div>
    );
  }

  const eventos = await getEventos(usuario);

  return (
    <div>
      <PageHeader
        title="Eventos"
        subtitle="Compartí el link de cada evento para sumar votantes inscriptos."
        action={
          <Link href="/eventos/nuevo" className="btn-primary">
            Crear evento
          </Link>
        }
      />

      {eventos.length === 0 ? (
        <EmptyState
          title="Todavía no creaste eventos"
          description="Creá un evento con foto y descripción, y compartí el link para que la gente se inscriba."
          cta={{ href: "/eventos/nuevo", label: "Crear evento" }}
          icon={<CalendarioIcon className="w-6 h-6" />}
        />
      ) : (
        <ul className="space-y-2.5">
          {eventos.map((ev) => (
            <li key={ev.id}>
              <Link
                href={`/eventos/${ev.id}`}
                className="card p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
              >
                {ev.foto_v ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/evento/${ev.slug}/foto?v=${ev.foto_v}`}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0"
                  />
                ) : (
                  <span className="w-16 h-16 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center shrink-0">
                    <CalendarioIcon className="w-6 h-6" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 truncate">{ev.nombre}</p>
                  {ev.inicia_local && (
                    <p className="text-xs text-muted first-letter:uppercase">
                      {formatearFechaEvento(ev.inicia_local)}
                    </p>
                  )}
                  {ev.direccion && <p className="text-xs text-muted truncate">{ev.direccion}</p>}
                  {ev.creador_id !== usuario.id && ev.creador_nombre && (
                    <p className="text-xs text-muted">Creó: {ev.creador_nombre}</p>
                  )}
                </div>
                <span className="chip bg-brand-100 text-brand-700 shrink-0">
                  {ev.inscriptos} {ev.inscriptos === 1 ? "inscripto" : "inscriptos"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
