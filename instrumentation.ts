import type { Instrumentation } from "next";

/**
 * Red de seguridad de errores del server. Next llama a `onRequestError` con
 * cualquier excepción que escape de un render, una route o una server action —
 * justo lo que antes se perdía: la persona veía una pantalla rota y del lado
 * nuestro no quedaba nada.
 *
 * Deja una línea JSON en stdout para todo, y además una fila en
 * `inscripcion_intentos` cuando el que se rompió fue el formulario público de
 * inscripción, para que un fallo de render aparezca en la misma consulta que un
 * fallo de la action.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  const digest =
    typeof err === "object" && err !== null && "digest" in err
      ? String((err as { digest?: unknown }).digest)
      : undefined;

  // Importación diferida: `lib/db` es sólo de Node y este archivo también se
  // carga en el runtime edge.
  const { mensajeError, nuevoCodigo, registrarIntentoEsperando } = await import(
    "@/lib/observabilidad"
  );
  const motivo = mensajeError(err);

  console.error(
    JSON.stringify({
      evt: "error_server",
      mensaje: motivo,
      digest,
      path: request.path,
      metodo: request.method,
      ruta: context.routePath,
      tipo: context.routeType,
    }),
  );

  if (context.routePath.startsWith("/evento/[slug]")) {
    await registrarIntentoEsperando({
      origen: "evento",
      resultado: "error",
      // El digest es lo que ve la persona en la pantalla de error, así que hace
      // de código de referencia.
      codigo: digest ?? nuevoCodigo(),
      motivo: `${context.routeType}: ${motivo}`,
      slug: request.path.split("?")[0].split("/")[2] ?? null,
    });
  }
};
