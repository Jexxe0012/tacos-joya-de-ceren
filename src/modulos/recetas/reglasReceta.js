/**
 * reglasReceta — las reglas del formulario de receta, separadas de las
 * operaciones sobre recetas.
 *
 * Cada regla recibe un valor y devuelve el mensaje que verá el usuario o
 * "". Así el formulario solo decide dónde pintarlas, y las mismas reglas
 * pueden comprobarse sin abrir la pantalla.
 */

import { numero, texto } from "../../utils/validaciones.js";
import { obtenerInsumo } from "../../services/insumosService.js";
import {
  CATEGORIAS,
  LIMITES,
  PATRON_BUSQUEDA,
  PATRON_NOMBRE,
  categoriaSeVende,
  moneda,
  recetaConMismoNombre
} from "./recetasService.js";

/**
 * Comparar precio * 100 con su redondeo falla con decimales: 1.15 * 100
 * da 114.99999999999999. Por eso se compara con un margen mínimo.
 */
function tieneMaximoDosDecimales(valor) {
  return Math.abs(Math.round(valor * 100) - valor * 100) < 1e-9;
}

/**
 * Reglas de los campos de la receta. Reciben el id de la receta que se
 * está editando, para que su propio nombre no cuente como repetido.
 */
export function reglasFormularioReceta(idActual = "") {
  return {
    nombre: valor => {
      const mensaje = texto(valor, {
        min: LIMITES.nombreMin,
        max: LIMITES.nombreMax,
        patron: PATRON_NOMBRE,
        mensaje: "Usa letras, números, espacios y los signos . , ' ( ) & -"
      });
      if (mensaje) return mensaje;
      const otra = recetaConMismoNombre(valor, idActual);
      return otra ? `Ya existe la receta «${otra.nombre}».` : "";
    },

    categoria: valor =>
      (CATEGORIAS.some(categoria => categoria.id === valor) ? "" : "Selecciona una categoría de la lista."),

    porciones: valor =>
      (numero(valor, { min: LIMITES.porcionesMin, max: LIMITES.porcionesMax, entero: true })
        ? `Usa un número entero de ${LIMITES.porcionesMin} a ${LIMITES.porcionesMax}.`
        : ""),

    tiempoMinutos: valor =>
      (numero(valor, { min: LIMITES.tiempoMin, max: LIMITES.tiempoMax, entero: true })
        ? `Usa minutos enteros, de ${LIMITES.tiempoMin} a ${LIMITES.tiempoMax}.`
        : ""),

    // El precio solo se pide si la categoría se vende; las preparaciones
    // base no se venden por separado.
    precioVenta: (valor, valores) => {
      if (!valores.categoria || !categoriaSeVende(valores.categoria)) return "";
      if (String(valor).trim() === "") return "Escribe el precio de venta.";
      if (numero(valor, { min: LIMITES.precioMin, max: LIMITES.precioMax })) {
        return `El precio va de ${moneda.format(LIMITES.precioMin)} a ${moneda.format(LIMITES.precioMax)}.`;
      }
      if (!tieneMaximoDosDecimales(Number(valor))) return "Usa como máximo dos decimales.";
      return "";
    },

    estado: valor => (["activa", "inactiva"].includes(valor) ? "" : "Selecciona un estado válido."),

    preparacion: valor =>
      texto(valor, { min: LIMITES.preparacionMin, max: LIMITES.preparacionMax })
  };
}

/**
 * Cantidad de un ingrediente. Los insumos que se cuentan por unidad
 * (tortillas, limones, vasos) solo aceptan números enteros.
 */
export function reglaCantidad(valor, insumo) {
  const limpio = String(valor ?? "").trim();
  const cantidad = Number(limpio);
  if (limpio === "") return "Escribe la cantidad.";
  if (!Number.isFinite(cantidad) || cantidad <= 0) return "La cantidad debe ser mayor que cero.";
  if (cantidad < LIMITES.cantidadMin) return `La cantidad mínima es ${LIMITES.cantidadMin}.`;
  if (cantidad > LIMITES.cantidadMax) return `La cantidad máxima es ${LIMITES.cantidadMax}.`;
  if (insumo && insumo.unidad === "unidad" && !Number.isInteger(cantidad)) {
    return `${insumo.nombre} se cuenta por unidades: usa un número entero.`;
  }
  return "";
}

/**
 * Revisa la lista de ingredientes completa. Devuelve un error por línea
 * ({ insumo, cantidad }) y el mensaje del grupo.
 *
 * Los repetidos se buscan en todas las líneas, aunque el usuario no haya
 * tocado una de ellas: el problema está en el par, no en una sola.
 */
export function revisarIngredientes(lineas) {
  const porLinea = lineas.map(() => ({}));
  const vistos = new Set();

  if (lineas.length === 0) {
    return { porLinea, grupo: "Agrega al menos un ingrediente.", ok: false };
  }

  lineas.forEach((linea, indice) => {
    const repetido = vistos.has(linea.insumoId);
    vistos.add(linea.insumoId);
    const insumo = obtenerInsumo(linea.insumoId);

    let errorInsumo = "";
    if (!insumo) errorInsumo = "Elige un insumo de la lista.";
    else if (!(insumo.costoUnitario > 0)) errorInsumo = "Este insumo no tiene un costo de referencia mayor que cero.";
    else if (repetido) errorInsumo = "Insumo repetido. Suma la cantidad en una sola línea.";

    const errorCantidad = reglaCantidad(linea.cantidad, insumo);
    if (errorInsumo) porLinea[indice].insumoId = errorInsumo;
    if (errorCantidad) porLinea[indice].cantidad = errorCantidad;
  });

  const ok = porLinea.every(errores => Object.keys(errores).length === 0);
  return { porLinea, grupo: ok ? "" : "Revisa los ingredientes marcados en rojo.", ok };
}

/** Texto de búsqueda del catálogo. */
export function reglaBusqueda(valor) {
  return texto(valor, {
    max: LIMITES.busquedaMax,
    patron: PATRON_BUSQUEDA,
    mensaje: "Usa solo letras, números y espacios."
  });
}
