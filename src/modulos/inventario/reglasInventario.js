/**
 * reglasInventario — reglas de los formularios de producto y movimiento.
 *
 * Separadas de las operaciones: reciben valores y devuelven el mensaje
 * que verá el usuario, sin tocar la pantalla ni guardar nada.
 */

import { fecha as reglaFecha, numero, texto } from "../../utils/validaciones.js";
import {
  UNIDADES_ENTERAS,
  formatoCantidad,
  productoConMismoNombre
} from "./inventarioService.js";

/** Existencia y mínimo: 0 o más; enteros si la unidad se cuenta por pieza. */
export function reglaCantidadProducto(valor, unidad) {
  return numero(valor, { min: 0, entero: UNIDADES_ENTERAS.includes(unidad) });
}

/**
 * Reglas del formulario de producto. Al editar, la existencia es de solo
 * lectura y no se valida; la caducidad sí puede quedar vencida, para
 * poder corregir otros datos sin tener que cambiarla.
 */
export function reglasProducto(idActual = "") {
  const editando = Boolean(idActual);
  return {
    nombre: valor => {
      const mensaje = texto(valor, { min: 3, max: 60 });
      if (mensaje) return mensaje;
      const otro = productoConMismoNombre(valor, idActual);
      return otro ? `Ya existe «${otro.nombre}» en ${otro.categoria}.` : "";
    },
    categoria: valor => (valor ? "" : "Elige la categoría."),
    unidad: valor => (valor ? "" : "Elige la unidad de medida."),
    cantidad: (valor, valores) => (editando ? "" : reglaCantidadProducto(valor, valores.unidad)),
    stockMinimo: (valor, valores) => reglaCantidadProducto(valor, valores.unidad),
    costoUnitario: valor => (numero(valor, { min: 0.01 }) ? "Escribe un costo mayor que 0." : ""),
    caducidad: valor => (valor ? reglaFecha(valor, { noPasada: !editando }) : ""),
    proveedor: valor => texto(valor, { max: 60 }),
    ubicacion: valor => texto(valor, { max: 60 })
  };
}

/**
 * Cantidad de un movimiento. En entrada y salida tiene que ser mayor que
 * cero; en un ajuste es la existencia contada, así que 0 también vale.
 * Una salida nunca puede pasar de lo que hay.
 */
export function reglaCantidadMovimiento(valor, { producto, tipo }) {
  const entero = producto ? UNIDADES_ENTERAS.includes(producto.unidad) : false;
  const minimo = tipo === "ajuste" ? 0 : (entero ? 1 : 0.01);
  const mensaje = numero(valor, { min: minimo, entero });
  if (mensaje || !producto) return mensaje;

  if (tipo === "salida" && Number(valor) > Number(producto.cantidad)) {
    return `Solo hay ${formatoCantidad(producto.cantidad)} ${producto.unidad}: no puedes sacar más.`;
  }
  return "";
}

/**
 * Un ajuste que cambia la existencia en más del 50 % necesita una nota.
 * Si había 0, cualquier cambio cuenta como grande: no se puede dividir
 * entre cero. Devuelve el cambio en texto ("de 18 a 5 kg") o "".
 */
export function cambioGrande({ producto, tipo, cantidad }) {
  const nueva = Number(cantidad);
  if (tipo !== "ajuste" || !producto || String(cantidad).trim() === "" || !Number.isFinite(nueva)) return "";

  const anterior = Number(producto.cantidad);
  if (nueva === anterior) return "";
  const esGrande = anterior === 0 || Math.abs(nueva - anterior) / anterior > 0.5;
  return esGrande ? `de ${formatoCantidad(anterior)} a ${formatoCantidad(nueva)} ${producto.unidad}` : "";
}

/** Con un cambio grande la nota pide 5 caracteres: una explicación, no una letra. */
export function reglaNota(valor, contexto) {
  const cambio = cambioGrande(contexto);
  if (!cambio) return texto(valor, { max: 300 });
  return texto(valor, { min: 5, max: 300 })
    ? `La existencia cambia mucho (${cambio}): explica el motivo en la nota.`
    : "";
}

/** Reglas del formulario de movimiento, atadas al producto y al tipo elegidos. */
export function reglasMovimiento(buscarProducto) {
  const contextoDe = valores => ({
    producto: buscarProducto(valores.productoId),
    tipo: valores.tipo,
    cantidad: valores.cantidad
  });

  return {
    productoId: valor => (valor ? "" : "Elige el producto."),
    cantidad: (valor, valores) => reglaCantidadMovimiento(valor, contextoDe(valores)),
    nota: (valor, valores) => reglaNota(valor, contextoDe(valores))
  };
}
