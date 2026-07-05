/* Iconografía CheVoto — sincronizada desde el design system (claude.ai/design).
   Line-icons 24×24, stroke 2, caps/joins redondeados, currentColor.
   Los iconos `Estado*` y la marca usan color fijo: el color ES el significado. */

type IconProps = { className?: string };

function LineIcon({ className, children, strokeWidth = 2 }: IconProps & { children: React.ReactNode; strokeWidth?: number }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/* — Territorio — */

export function MapaIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" />
    </LineIcon>
  );
}

export function PinUbicacionIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M12 21s-7-6.5-7-11.5a7 7 0 0 1 14 0C19 14.5 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" />
    </LineIcon>
  );
}

export function RecorridoIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" />
      <path d="M6 17v-2a3 3 0 0 1 3-3h6a3 3 0 0 0 3-3V7" strokeDasharray="0.5 3" />
    </LineIcon>
  );
}

export function ViviendaIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9v11h14V9" /><path d="M9.5 20v-6h5v6" />
    </LineIcon>
  );
}

/* — Votantes — */

export function VotanteIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <circle cx="12" cy="8" r="4" /><path d="M5 21v-1a7 7 0 0 1 14 0v1" />
    </LineIcon>
  );
}

export function VotantesIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <circle cx="9" cy="8" r="3.5" /><path d="M2.5 21v-1a6.5 6.5 0 0 1 13 0v1" />
      <path d="M16 4.2a3.5 3.5 0 0 1 0 7.6M18.5 21v-1a6.5 6.5 0 0 0-2.2-4.9" />
    </LineIcon>
  );
}

export function AgregarVotanteIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <circle cx="10" cy="8" r="3.6" /><path d="M4 21v-1a6 6 0 0 1 12 0" /><path d="M19 7v6M22 10h-6" />
    </LineIcon>
  );
}

export function MilitanteIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" /><circle cx="8.5" cy="10" r="2.3" />
      <path d="M5 16a3.5 3.5 0 0 1 7 0" /><path d="M15 9h4M15 13h4" />
    </LineIcon>
  );
}

/* — Padrón y clasificación — */

export function PadronIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M15 4h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1Z" />
      <path d="M8.5 12.5 10.5 14.5 14 11M8.5 18h7" />
    </LineIcon>
  );
}

export function ConfirmadoIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M21.5 11v1A10 10 0 1 1 15.6 3" /><path d="M9 11.5 12 14.5 22 4.5" />
    </LineIcon>
  );
}

export function FavoritoIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="m12 2 3 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.9 21l1.1-6.9-5-4.9 6.9-1L12 2Z" />
    </LineIcon>
  );
}

export function PrioridadIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1Z" /><path d="M4 22v-7" />
    </LineIcon>
  );
}

/* — Estado del votante (color fijo, NO currentColor) — */

export function EstadoFavorableIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill="#0EA372" />
      <path d="M8 12.2 11 15.2 16.5 8.8" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EstadoIndecisoIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill="#94A3B8" />
      <path d="M9.3 9.2a2.8 2.8 0 1 1 3.6 3.4c-.9.4-1.4 1-1.4 2M11.5 17.2h.01" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EstadoContrarioIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill="#F97316" />
      <path d="M9 9l6 6M15 9l-6 6" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* — Contacto y captura — */

export function ContactoWspIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3a8.5 8.5 0 0 1 8.5 8.5Z" />
    </LineIcon>
  );
}

export function TelefonoIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.1 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7 12.8 12.8 0 0 0 .7 2.8 2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4 12.8 12.8 0 0 0 2.8.7 2 2 0 0 1 1.7 2Z" />
    </LineIcon>
  );
}

export function CamaraCedulaIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" /><circle cx="12" cy="13" r="4" />
    </LineIcon>
  );
}

export function NotaIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /><path d="M8 8h8M8 12h5" />
    </LineIcon>
  );
}

/* — Datos y navegación — */

export function PanelIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M3 3v18h18" /><path d="M7 16v-5M12 16V7M17 16v-3" />
    </LineIcon>
  );
}

export function CalendarioIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 3v4M16 3v4" /><path d="M12 14h.01" />
    </LineIcon>
  );
}

export function BuscarIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" />
    </LineIcon>
  );
}

export function FiltroIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z" />
    </LineIcon>
  );
}

/* — Sistema — */

export function SincronizarIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M23 4v6h-6M1 20v-6h6" /><path d="M20.5 9A9 9 0 0 0 5.6 5.6L1 10M23 14l-4.6 4.4A9 9 0 0 1 3.5 15" />
    </LineIcon>
  );
}

export function OfflineIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M22.6 17A5 5 0 0 0 18 10h-1.3a8 8 0 0 0-7-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3" /><path d="m1 1 22 22" />
    </LineIcon>
  );
}

export function ConfigIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </LineIcon>
  );
}

/* — Marca (no redibujar; colores fijos) — */

export function ChevotoMark({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 300 320">
      <path
        d="M0.0 113.2 L14.1 66.5 L15.0 45.6 L32.1 11.3 L94.4 0.0 L127.6 0.6 L160.9 20.5 L161.5 32.5 L172.1 54.1 L169.7 107.0 L207.5 114.5 L222.1 106.8 L246.2 117.4 L252.9 129.0 L256.2 164.7 L260.4 179.7 L273.7 181.4 L287.1 175.1 L300.0 182.2 L300.0 203.6 L295.1 226.6 L288.1 249.1 L282.3 283.5 L249.8 313.3 L221.6 319.5 L181.4 313.6 L145.4 303.0 L180.6 243.8 L175.4 226.6 L138.6 211.4 L94.9 182.6 L65.7 176.7 L0.0 113.2 Z"
        fill="#0EA372"
      />
      <path d="M114 165 L142 193 L192 119" fill="none" stroke="#FFFFFF" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* — Utilitarios (fuera del set CheVoto; misma construcción) — */

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <LineIcon className={className} strokeWidth={2.2}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </LineIcon>
  );
}

export function LogoutIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M15 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h9" /><path d="M10 12h11M18 8l4 4-4 4" />
    </LineIcon>
  );
}
