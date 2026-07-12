/**
 * Validación de celular paraguayo, compartida por el form (cliente) y la server
 * action del formulario público. Módulo puro (sin "server-only") para poder
 * importarlo desde ambos lados. Mirror de la lógica del prototipo .dc.html.
 *
 * Un móvil PY local es "09xx xxx xxx" (10 dígitos, empieza con 09). Aceptamos
 * también el formato internacional 595… normalizándolo al 0 inicial.
 */
export function normalizarCelular(v: string | null | undefined): string {
  return (v || "").replace(/\D/g, "").replace(/^595/, "0");
}

export function celularValidoPY(v: string | null | undefined): boolean {
  return /^09\d{8}$/.test(normalizarCelular(v));
}
