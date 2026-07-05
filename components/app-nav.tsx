"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, UsersIcon, MapIcon, OrgIcon } from "@/components/icons";

const ITEMS = [
  { href: "/", label: "Inicio", icon: HomeIcon, exact: true },
  { href: "/votantes", label: "Votantes", icon: UsersIcon, exact: false },
  { href: "/mapa", label: "Mapa", icon: MapIcon, exact: false },
  { href: "/organigrama", label: "Equipo", icon: OrgIcon, exact: false },
];

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

/** Desktop: horizontal links in the header. */
export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden md:flex items-center gap-1">
      {ITEMS.map((item) => {
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

/** Mobile: fixed bottom tab bar. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[var(--color-line)] pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4">
        {ITEMS.map((item) => {
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
        })}
      </div>
    </nav>
  );
}
