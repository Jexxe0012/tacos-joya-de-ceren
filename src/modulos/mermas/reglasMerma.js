/**
 * reglasMerma — reglas del formulario de merma.
 *
 * Las comparten la pantalla de Mermas y la merma rápida de Turnos, así
 * las dos piden lo mismo. Reciben valores y devuelven el mensaje que
 * verá el usuario.
 */

import { numero, texto } from "../../utils/validaciones.js";
import { UNIDADES_ENTERAS } from "../inventario/inventarioService.js";
import { MOTIVO_OTRO, numeroLegible } from "./mermasService.js";

export const MIN_RESPONSABLE = 3;
export const MAX_RESPONSABLE = 60;
export const MAX_OBSERVACIONES = 200;
export const CANTIDAD_MINIMA = 0.1;

/** Solo letras (con tildes y ñ) y espacios. */
const PATRON_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/;

/** Quita tildes y mayúsculas para comparar la unidad con la lista. */
function normalizar(valor) {
  return String(valor || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function unidadEsEntera(producto) {
  return Boolean(producto) && UNIDADES_ENTERAS.includes(normalizar(producto.unidad));
}

/**
 * Cantidad perdida: mayor que cero, entera si la unidad se cuenta por
 * pieza, y nunca más de lo que hay en existencia.
 */
export function reglaCantidad(valor, producto) {
  const limpio = String(valor ?? "").trim();
  if (limpio === "") return "Escribí la cantidad perdida.";

  const mensaje = numero(limpio, { min: CANTIDAD_MINIMA, entero: unidadEsEntera(producto) });
  if (mensaje) return mensaje;

  if (producto && Number(limpio) > Number(producto.cantidad)) {
    return `Solo hay ${numeroLegible.format(producto.cantidad)} ${producto.unidad} de ${producto.nombre}.`;
  }
  return "";
}

/**
 * Reglas del formulario completo. "buscarProducto" permite revisar la
 * cantidad contra la existencia del producto elegido.
 */
export function reglasMerma(buscarProducto) {
  return {
    productoId: valor => (valor ? "" : "Elegí el ingrediente que se perdió."),

    cantidad: (valor, valores) => reglaCantidad(valor, buscarProducto(valores.productoId)),

    motivo: valor => (valor ? "" : "Elegí un motivo de la lista."),

    responsable: valor => texto(valor, {
      min: MIN_RESPONSABLE,
      max: MAX_RESPONSABLE,
      patron: PATRON_NOMBRE,
      mensaje: `Solo letras y espacios, de ${MIN_RESPONSABLE} a ${MAX_RESPONSABLE} caracteres.`
    }),

    observaciones: (valor, valores) => {
      const limpio = String(valor ?? "").trim();
      if (limpio.length > MAX_OBSERVACIONES) {
        return `Máximo ${MAX_OBSERVACIONES} caracteres (llevás ${limpio.length}).`;
      }
      if (valores.motivo === MOTIVO_OTRO && limpio === "") {
        return 'Si el motivo es "Otro", explicalo en las observaciones.';
      }
      return "";
    }
  };
}
