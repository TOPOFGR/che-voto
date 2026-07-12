/**
 * Kebab-case un nombre para usarlo en el link público /apoyar/<slug>:
 * saca acentos (NFD + descarta diacríticos U+0300–U+036F), pasa a minúsculas y
 * colapsa todo lo que no sea [a-z0-9] en guiones. Devuelve "" si no queda nada
 * usable (quien llama decide el fallback). Mirror del slug del prototipo .dc.html.
 */
export function slugify(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
