/**
 * Arma el link de wa.me a partir de un teléfono tipeado. WhatsApp exige el
 * número en formato internacional sin "+", espacios ni guiones. Asumimos
 * Paraguay (595): un número local "09xx xxx xxx" pierde el 0 y se le antepone
 * 595. Devuelve null si no hay dígitos suficientes para un número válido.
 */
export function whatsappUrl(telefono: string | null | undefined): string | null {
  if (!telefono) return null;
  let d = telefono.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("595")) {
    // ya tiene el código de país
  } else if (d.startsWith("0")) {
    d = "595" + d.slice(1);
  } else {
    d = "595" + d;
  }
  // Un móvil paraguayo con código de país tiene 12 dígitos (595 + 9 locales).
  if (d.length < 11) return null;
  return `https://wa.me/${d}`;
}
