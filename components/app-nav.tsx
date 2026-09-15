"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PanelIcon,
  VotantesIcon,
  MapaIcon,
  MilitanteIcon,
  AgregarVotanteIcon,
  CalendarioIcon,
} from "@/components/icons";

// El catálogo de partidos/listas no va en la navegación: el admin entra
// desde el botón "Partidos y listas" en Equipo (/organigrama).
const ITEMS = [
  { href: "/", label: "Inicio", icon: PanelIcon, exact: true },
  { href: "/votantes", label: "Votantes", icon: VotantesIcon, exact: false },
  { href: "/mapa", label: "Mapa", icon: MapaIcon, exact: false },
  { href: "/organigrama", label: "Equipo", icon: MilitanteIcon, exact: false },
];

// Sólo en la barra de escritorio: en mobile rompería el botón central "Cargar"
// (ahí se entra desde la tarjeta de Inicio).
const EVENTOS_ITEM = { href: "/eventos", label: "Eventos", icon: CalendarioIcon, exact: false };

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

/** Desktop: horizontal links in the header. `mostrarEventos` for roles that create events. */
export function TopNav({ mostrarEventos = false }: { mostrarEventos?: boolean }) {
  const pathname = usePathname();
  const items = mostrarEventos ? [...ITEMS, EVENTOS_ITEM] : ITEMS;
  return (
    <nav className="hidden md:flex items-center gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobile: fixed bottom tab bar with the primary "Cargar" action in the center. */
export function BottomNav() {
  const pathname = usePathname();
  const mid = ITEMS.length / 2;

  const tab = (item: (typeof ITEMS)[number]) => {
    const active = isActive(pathname, item.href, item.exact);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
          active ? "text-brand-600" : "text-slate-500"
        }`}
      >
        <item.icon className="w-5 h-5" />
        {item.label}
      </Link>
    );
  };

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[var(--color-line)] pb-[env(safe-area-inset-bottom)]">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${ITEMS.length + 1}, minmax(0, 1fr))` }}>
        {ITEMS.slice(0, mid).map(tab)}
        <Link href="/votantes/nuevo" className="flex flex-col items-center gap-1 pt-1.5 pb-2">
          <span
            className="flex h-10 w-10 -mt-4 items-center justify-center rounded-full bg-brand-500 text-white"
            style={{ boxShadow: "var(--shadow-cta)" }}
          >
            <AgregarVotanteIcon className="w-[22px] h-[22px]" />
          </span>
          <span className="text-[11px] font-semibold text-brand-600">Cargar</span>
        </Link>
        {ITEMS.slice(mid).map(tab)}
      </div>
    </nav>
  );
}
