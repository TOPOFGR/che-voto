import "server-only";
import { headers } from "next/headers";

/** IP del cliente detrás del proxy/host (primer hop de x-forwarded-for). */
export async function ipDelCliente(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const primera = xff?.split(",")[0]?.trim();
  return primera || h.get("x-real-ip") || "desconocida";
}
