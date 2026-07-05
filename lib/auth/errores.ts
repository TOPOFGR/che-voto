/**
 * Neon Auth devuelve errores con mensaje en inglés y, cuando está disponible,
 * un `code` estable (better-auth). Acá se traducen los códigos que pueden
 * aparecer en nuestros flujos (login, registro por invitación, reset).
 * Si no conocemos el código NO mostramos el mensaje en inglés: cae al
 * fallback en español que pasa cada flujo.
 */
const MENSAJES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Correo o contraseña incorrectos.",
  INVALID_PASSWORD: "La contraseña es incorrecta.",
  INVALID_EMAIL: "El correo no es válido.",
  USER_NOT_FOUND: "No existe una cuenta con ese correo.",
  USER_EMAIL_NOT_FOUND: "No existe una cuenta con ese correo.",
  ACCOUNT_NOT_FOUND: "No encontramos esa cuenta.",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "Esa cuenta no tiene contraseña configurada.",
  USER_ALREADY_EXISTS: "Ya existe una cuenta con ese correo. Iniciá sesión.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ya existe una cuenta con ese correo. Usá otro.",
  PASSWORD_TOO_SHORT: "La contraseña es demasiado corta: usá al menos 8 caracteres.",
  PASSWORD_TOO_LONG: "La contraseña es demasiado larga.",
  EMAIL_NOT_VERIFIED: "Tenés que verificar tu correo antes de ingresar.",
  INVALID_TOKEN: "El enlace venció o no es válido. Pedí uno nuevo.",
  TOO_MANY_ATTEMPTS: "Demasiados intentos. Esperá un momento y probá de nuevo.",
  SESSION_EXPIRED: "La sesión venció. Iniciá sesión de nuevo.",
  FAILED_TO_CREATE_SESSION: "No se pudo iniciar la sesión. Intentá de nuevo.",
  UNEXPECTED_ERROR: "Ocurrió un error inesperado. Intentá de nuevo.",
};

type AuthErrorLike = { code?: string | null; status?: number | null } | null | undefined;

/** Mensaje en español para un error de Neon Auth; `fallback` si el código es desconocido. */
export function mensajeAuthError(error: AuthErrorLike, fallback: string): string {
  if (error?.code && MENSAJES[error.code]) return MENSAJES[error.code];
  if (error?.status === 429) return MENSAJES.TOO_MANY_ATTEMPTS;
  return fallback;
}
