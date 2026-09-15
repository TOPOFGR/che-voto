import "server-only";
import { headers } from "next/headers";

/** IP del cliente detrás del proxy/host (primer hop de x-forwarded-for). */
export async function ipDelCliente(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const primera = xff?.split(",")[0]?.trim();
  return primera || h.get("x-real-ip") || "desconocida";
}

export interface ContextoCliente {
  ip: string;
  /** User-agent crudo; sirve para reconocer patrones de navegador en los fallos. */
  userAgent: string | null;
}

/** IP + user-agent en una sola lectura de headers, para instrumentar un envío. */
export async function contextoCliente(): Promise<ContextoCliente> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const primera = xff?.split(",")[0]?.trim();
  return {
    ip: primera || h.get("x-real-ip") || "desconocida",
    userAgent: h.get("user-agent"),
  };
}
