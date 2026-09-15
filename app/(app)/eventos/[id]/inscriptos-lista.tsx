"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { SEXOS, type Sexo } from "@/lib/eventos-config";
import { whatsappUrl } from "@/lib/whatsapp";
import type { Inscripto } from "@/lib/eventos";

/** Normaliza para buscar sin acentos ni mayúsculas. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Listado de los inscriptos a un evento, con buscador local: la pantalla ya
 * trae todas las filas, así que filtrar en el cliente evita ida y vuelta al
 * servidor mientras la persona tipea.
 */
export function InscriptosLista({ inscriptos }: { inscriptos: Inscripto[] }) {
  const [q, setQ] = useState("");

  const indexados = useMemo(
    () =>
      inscriptos.map((i) => ({
        inscripto: i,
        busqueda: normalizar(
          [i.nombre, i.numero_cedula, i.telefono, i.barrio, i.ciudad]
            .filter(Boolean)
            .join(" "),
        ),
      })),
    [inscriptos],
  );

  const filtrados = useMemo(() => {
    const termino = normalizar(q.trim());
    if (!termino) return inscriptos;
    return indexados.filter((x) => x.busqueda.includes(termino)).map((x) => x.inscripto);
  }, [q, inscriptos, indexados]);

  return (
    <div className="flex flex-col gap-3">
      {inscriptos.length > 5 && (
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, cédula, teléfono o barrio…"
          aria-label="Buscar inscriptos"
          className="field"
        />
      )}

      {q.trim() && (
        <p className="text-xs text-muted">
          {filtrados.length} {filtrados.length === 1 ? "resultado" : "resultados"} de{" "}
          {inscriptos.length}
        </p>
      )}

      {filtrados.length === 0 ? (
        <p className="text-sm text-muted">No hay inscriptos que coincidan con la búsqueda.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-line)]">
          {filtrados.map((i) => {
            const waUrl = whatsappUrl(i.telefono);
            const sexo = i.genero && i.genero in SEXOS ? SEXOS[i.genero as Sexo] : null;
            const lugar = [i.barrio, i.ciudad].filter(Boolean).join(", ");
            return (
              <li key={i.persona_id} className="py-2.5 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  {/* Sólo linkeamos la ficha si el votante está en el alcance
                      del usuario; si no, el detalle devolvería 404. */}
                  {i.visible ? (
                    <Link
                      href={`/votantes/${i.persona_id}`}
                      className="font-medium text-slate-900 hover:text-brand-700 hover:underline block truncate"
                    >
                      {i.nombre}
                    </Link>
                  ) : (
                    <p className="font-medium text-slate-900 truncate">{i.nombre}</p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                    {i.numero_cedula && <span>CI {i.numero_cedula}</span>}
                    {sexo && <span>{sexo}</span>}
                    {i.edad != null && <span>{i.edad} años</span>}
                    {lugar && <span>{lugar}</span>}
                    {i.telefono && <span>{i.telefono}</span>}
                    <span>Se inscribió {i.inscripto_at}</span>
                  </div>
                </div>
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Enviar WhatsApp"
                    aria-label={`Enviar WhatsApp a ${i.nombre}`}
                    className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full border border-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                  >
                    <Image src="/icons/whatsapp.png" alt="" width={24} height={24} aria-hidden />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
