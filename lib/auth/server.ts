import { createNeonAuth } from "@neondatabase/auth/next/server";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    // El paquete usa `strict` por defecto. En una PWA instalada (display
    // `standalone`), el arranque en frío desde el ícono es una navegación
    // top-level sin iniciador same-site, por lo que el navegador no envía las
    // cookies `SameSite=Strict` en esa primera request y la sesión aparece
    // como cerrada. `lax` las envía en navegaciones top-level GET (incluido el
    // lanzamiento de la PWA) manteniendo la protección CSRF.
    sameSite: "lax",
  },
});
