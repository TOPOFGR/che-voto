/**
 * Avatar del usuario. Si tiene foto (`fotoUpdatedAt`), la sirve desde el route
 * handler `/api/usuarios/[id]/foto` con `?v=<ts>` para cache-busting. Si no,
 * muestra las iniciales sobre un círculo esmeralda (neutralidad de colores del
 * design system). Sin hooks: sirve tanto en server components como en el form.
 *
 * `previewSrc` permite pasar un object URL local (preview antes de subir).
 */
export function Avatar({
  id,
  nombre,
  fotoUpdatedAt,
  previewSrc,
  size = 40,
  className = "",
}: {
  id: string;
  nombre: string;
  fotoUpdatedAt?: string | null;
  previewSrc?: string | null;
  size?: number;
  className?: string;
}) {
  const src =
    previewSrc ??
    (fotoUpdatedAt
      ? `/api/usuarios/${id}/foto?v=${encodeURIComponent(fotoUpdatedAt)}`
      : null);

  const style = { width: size, height: size };

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={nombre}
        width={size}
        height={size}
        style={style}
        className={`rounded-full object-cover bg-brand-50 shrink-0 ${className}`}
      />
    );
  }

  return (
    <span
      style={{ ...style, fontSize: Math.round(size * 0.4) }}
      className={`flex items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      {iniciales(nombre)}
    </span>
  );
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
