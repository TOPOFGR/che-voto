/**
 * Redimensiona una imagen a un máximo de `maxLado` px de lado usando un canvas y
 * la exporta como JPEG. Evita subir fotos enormes desde el celular sin necesitar
 * una librería de imágenes en el server. Sólo para el navegador.
 */
export function redimensionarImagen(
  file: File,
  maxLado: number,
  calidad = 0.85,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * escala));
      const h = Math.max(1, Math.round(img.height * escala));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas ctx"));
      // JPEG no tiene transparencia: sin fondo, un PNG transparente (p.ej. un
      // logo) queda con fondo negro. Pintamos blanco antes de dibujar.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("toBlob null"));
          resolve(new File([blob], "foto.jpg", { type: "image/jpeg" }));
        },
        "image/jpeg",
        calidad,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("no se pudo leer la imagen"));
    };
    img.src = url;
  });
}
