import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { InscriptoPlanilla } from "@/lib/eventos";

// A4 vertical, en puntos.
const ANCHO = 595.28;
const ALTO = 841.89;
const MARGEN = 36;
const FILA = 22; // Alto de fila: deja lugar para tildar a mano.
const TAM = 9; // Tamaño de letra de las filas.

const TINTA = rgb(0.06, 0.09, 0.16);
const TENUE = rgb(0.39, 0.45, 0.55);
const LINEA = rgb(0.8, 0.83, 0.87);
const FONDO_CABECERA = rgb(0.95, 0.96, 0.97);

interface Columna {
  titulo: string;
  ancho: number;
  valor?: (i: InscriptoPlanilla, n: number) => string;
}

const ANCHO_UTIL = ANCHO - 2 * MARGEN;
const COLUMNAS: Columna[] = [
  { titulo: "#", ancho: 26, valor: (_, n) => String(n) },
  { titulo: "Presente", ancho: 48 },
  { titulo: "Nombre y apellido", ancho: 0, valor: (i) => i.nombre },
  { titulo: "Cédula", ancho: 68, valor: (i) => i.numero_cedula ?? "" },
  { titulo: "Teléfono", ancho: 84, valor: (i) => i.telefono ?? "" },
  { titulo: "Ciudad", ancho: 100, valor: (i) => i.ciudad ?? "" },
];
// "Nombre y apellido" se queda con el ancho que sobra.
COLUMNAS[2].ancho = ANCHO_UTIL - COLUMNAS.reduce((s, c) => s + c.ancho, 0);

export interface DatosPlanilla {
  titulo: string;
  // "Sábado 20 de septiembre · 18:00 hs", dirección, etc. Una línea cada uno.
  detalles: string[];
  inscriptos: InscriptoPlanilla[];
  // Total real de inscriptos (puede superar las filas si se topeó la consulta).
  total: number;
  generado: string;
}

/**
 * Planilla de asistencia de un evento: título, datos del evento y una fila por
 * inscripto con una casilla "Presente". La casilla es un checkbox de formulario
 * PDF, así que se puede tildar en pantalla (tablet/celular) o imprimir y marcar
 * a mano.
 */
export async function generarPlanillaAsistencia(datos: DatosPlanilla): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Asistencia · ${datos.titulo}`);
  pdf.setCreator("CheVoto");
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const form = pdf.getForm();

  // Las fuentes estándar sólo cubren WinAnsi (alcanza para el español); lo que
  // no entra —emojis, otros alfabetos— se descarta para que no explote.
  const soportados = new Set(normal.getCharacterSet());
  const limpio = (t: string) =>
    Array.from(t.normalize("NFC").replace(/[\r\n\t]+/g, " "))
      .filter((c) => soportados.has(c.codePointAt(0)!))
      .join("")
      .replace(/ {2,}/g, " ")
      .trim();

  let pagina = pdf.addPage([ANCHO, ALTO]);
  let y = ALTO - MARGEN;

  // --- Encabezado (sólo en la primera página) ---
  for (const renglon of partirEnLineas(limpio(datos.titulo), negrita, 18, ANCHO_UTIL)) {
    y -= 20;
    pagina.drawText(renglon, { x: MARGEN, y, size: 18, font: negrita, color: TINTA });
  }
  y -= 4;
  const resumen =
    datos.total === 1 ? "1 inscripto" : `${datos.total} inscriptos`;
  for (const detalle of [...datos.detalles, resumen]) {
    for (const renglon of partirEnLineas(limpio(detalle), normal, 10, ANCHO_UTIL)) {
      y -= 14;
      pagina.drawText(renglon, { x: MARGEN, y, size: 10, font: normal, color: TENUE });
    }
  }
  y -= 14;

  const cabecera = () => {
    y -= FILA;
    pagina.drawRectangle({
      x: MARGEN,
      y,
      width: ANCHO_UTIL,
      height: FILA,
      color: FONDO_CABECERA,
    });
    let x = MARGEN;
    for (const col of COLUMNAS) {
      pagina.drawText(col.titulo, {
        x: x + 4,
        y: y + (FILA - TAM) / 2 + 1,
        size: TAM,
        font: negrita,
        color: TINTA,
      });
      x += col.ancho;
    }
    linea(pagina, y);
  };
  cabecera();

  datos.inscriptos.forEach((inscripto, idx) => {
    if (y - FILA < MARGEN + 16) {
      pagina = pdf.addPage([ANCHO, ALTO]);
      y = ALTO - MARGEN;
      cabecera();
    }
    y -= FILA;
    let x = MARGEN;
    for (const col of COLUMNAS) {
      if (col.valor) {
        const texto = recortar(limpio(col.valor(inscripto, idx + 1)), normal, TAM, col.ancho - 8);
        pagina.drawText(texto, {
          x: x + 4,
          y: y + (FILA - TAM) / 2 + 1,
          size: TAM,
          font: normal,
          color: col.titulo === "#" ? TENUE : TINTA,
        });
      } else {
        const lado = 12;
        const casilla = form.createCheckBox(`presente_${idx + 1}`);
        casilla.addToPage(pagina, {
          x: x + (col.ancho - lado) / 2,
          y: y + (FILA - lado) / 2,
          width: lado,
          height: lado,
          borderWidth: 1,
          borderColor: TINTA,
          backgroundColor: rgb(1, 1, 1),
        });
      }
      x += col.ancho;
    }
    linea(pagina, y);
  });

  if (datos.inscriptos.length < datos.total) {
    y -= 16;
    pagina.drawText(
      `Se listan ${datos.inscriptos.length} de ${datos.total} inscriptos.`,
      { x: MARGEN, y, size: TAM, font: normal, color: TENUE },
    );
  }

  // --- Pie: fecha de generación y numeración ---
  const paginas = pdf.getPages();
  paginas.forEach((p, i) => {
    const pie = `Página ${i + 1} de ${paginas.length}`;
    p.drawText(limpio(`Generado el ${datos.generado}`), {
      x: MARGEN,
      y: MARGEN - 16,
      size: 8,
      font: normal,
      color: TENUE,
    });
    p.drawText(pie, {
      x: ANCHO - MARGEN - normal.widthOfTextAtSize(pie, 8),
      y: MARGEN - 16,
      size: 8,
      font: normal,
      color: TENUE,
    });
  });

  return pdf.save();
}

function linea(pagina: PDFPage, y: number) {
  pagina.drawLine({
    start: { x: MARGEN, y },
    end: { x: ANCHO - MARGEN, y },
    thickness: 0.5,
    color: LINEA,
  });
}

/** Recorta con "…" para que el texto entre en una celda. */
function recortar(texto: string, font: PDFFont, size: number, max: number): string {
  if (font.widthOfTextAtSize(texto, size) <= max) return texto;
  let t = texto;
  while (t.length > 0 && font.widthOfTextAtSize(`${t}…`, size) > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Parte un texto en líneas que entren en `max` (para el título y los detalles). */
function partirEnLineas(texto: string, font: PDFFont, size: number, max: number): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (font.widthOfTextAtSize(prueba, size) <= max || !actual) {
      actual = prueba;
    } else {
      lineas.push(recortar(actual, font, size, max));
      actual = palabra;
    }
  }
  if (actual) lineas.push(recortar(actual, font, size, max));
  return lineas.length ? lineas : [""];
}
