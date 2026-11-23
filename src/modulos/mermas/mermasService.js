/**
 * mermasService — la operación compartida de registrar una merma.
 *
 * Registrar una merma toca tres colecciones a la vez:
 *   - "inventario":  descuenta la existencia del producto;
 *   - "movimientos": deja el rastro como una salida por desperdicio;
 *   - "mermas":      guarda el registro con su motivo y su responsable.
 *
 * Las tres escrituras van en un solo lote: si alguna falla, ninguna
 * queda hecha y el error se propaga. Nunca queda una existencia
 * descontada sin su merma, ni una merma sin descuento.
 *
 * La usan el formulario de Mermas y la merma rápida de Turnos, así los
 * dos historiales son uno solo y las reglas no se repiten.
 */

import { db } from "../../services/storage.js";
import { fechaHoyLocal, haceDias } from "../../utils/fechas.js";
import {
  COLECCION as COLECCION_INVENTARIO,
  COLECCION_MOVIMIENTOS,
  aplicarMovimiento,
  obtenerProducto
} from "../inventario/inventarioService.js";

export const COLECCION = "mermas";

/**
 * Mismo motivo que usa el modal de movimientos de Inventario para una
 * salida por desperdicio. Mantenerlo igual permite filtrar el historial.
 */
export const MOTIVO_SALIDA_MERMA = "Merma o desperdicio";

/** Motivos de merma que ofrece el formulario. */
export const MOTIVOS = [
  "Vencido",
  "Mal preparado",
  "Caída o contaminación",
  "Sobrante del día",
  "Otro"
];

export const MOTIVO_OTRO = "Otro";

/** Días que abarca el indicador de merma semanal. */
export const DIAS_SEMANA = 7;

export const unDecimal = new Intl.NumberFormat("es-SV", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const numeroLegible = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 2 });
export const moneda = new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" });

/**
 * Convierte una cantidad guardada a número. Los registros antiguos
 * pueden traer "5 kg" como texto: se toma el 5. Si no hay ningún número
 * vale 0, y así ningún indicador muestra NaN.
 */
export function numeroSeguro(valor) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  const encontrado = String(valor ?? "").replace(",", ".").match(/\d+(\.\d+)?/);
  const numero = encontrado ? Number(encontrado[0]) : NaN;
  return Number.isFinite(numero) ? numero : 0;
}

export function listarMermas() {
  return db.getAll(COLECCION);
}

/** Mermas de los últimos días, por fecha local. */
export function mermasDeLaSemana(mermas, dias = DIAS_SEMANA) {
  const limite = haceDias(dias);
  return mermas.filter(merma => String(merma.fecha) >= limite);
}

/**
 * Registra la merma y descuenta la existencia.
 *
 * Valida contra los datos guardados en el momento de escribir, no contra
 * los que vio el formulario: entre que se abre la confirmación y se
 * acepta, la existencia puede haber cambiado.
 *
 * Devuelve { producto, cantidad, existenciaNueva, merma }.
 */
export function registrarMerma({
  productoId,
  cantidad,
  motivo,
  responsable,
  observaciones = "",
  usuario,
  reportadoPor,
  // La merma rápida de Turnos deja elegir el día; la pantalla de Mermas
  // siempre registra la de hoy.
  fecha = fechaHoyLocal()
}) {
  const numero = Number(cantidad);
  if (!Number.isFinite(numero) || numero <= 0) {
    throw new Error("La cantidad de la merma no es válida.");
  }

  const producto = obtenerProducto(productoId);
  if (!producto) throw new Error("El producto ya no está en el inventario.");
  if (numero > Number(producto.cantidad)) {
    throw new Error(
      `Solo hay ${numeroLegible.format(producto.cantidad)} ${producto.unidad} de ${producto.nombre}.`
    );
  }

  return db.enLote([COLECCION_INVENTARIO, COLECCION_MOVIMIENTOS, COLECCION], () => {
    // La salida pasa por la misma puerta que los demás movimientos de
    // inventario, para que el historial quede igual venga de donde venga.
    const { existenciaNueva } = aplicarMovimiento({
      productoId: producto.id,
      tipo: "salida",
      cantidad: numero,
      motivo: MOTIVO_SALIDA_MERMA,
      nota: observaciones,
      usuario
    });

    // Los mismos campos que creaba el modal de Turnos, más los propios de
    // la pantalla de Mermas. La fecha es la local del día, no la UTC.
    const merma = db.create(COLECCION, {
      producto: producto.nombre,
      productoId: producto.id,
      unidad: producto.unidad,
      cantidad: numero,
      fecha,
      motivo,
      responsable,
      observaciones,
      reportadoPor
    });

    return { producto, cantidad: numero, existenciaNueva, merma };
  });
}

/**
 * Los tres indicadores de la semana: kilos perdidos, su costo estimado y
 * el insumo que más acumula.
 */
export function indicadoresDeLaSemana(mermas, productos) {
  const semana = mermasDeLaSemana(mermas);
  const total = semana.reduce((suma, merma) => suma + numeroSeguro(merma.cantidad), 0);

  const costo = semana.reduce((suma, merma) => {
    const producto = productos.find(item => String(item.id) === String(merma.productoId));
    return suma + numeroSeguro(merma.cantidad) * numeroSeguro(producto?.costoUnitario);
  }, 0);

  const porInsumo = new Map();
  for (const merma of semana) {
    const clave = merma.producto || "Sin nombre";
    porInsumo.set(clave, (porInsumo.get(clave) || 0) + numeroSeguro(merma.cantidad));
  }
  const critico = [...porInsumo].sort((a, b) => b[1] - a[1])[0] ?? null;

  return {
    total,
    costo,
    critico: critico ? { nombre: critico[0], cantidad: critico[1] } : null,
    porcentaje: critico && total > 0 ? Math.round(critico[1] / total * 100) : 0
  };
}

/** Texto de la cantidad: si un registro antiguo ya trae la unidad, no se repite. */
export function textoCantidad(merma) {
  if (typeof merma.cantidad === "number") {
    return `${numeroLegible.format(merma.cantidad)} ${merma.unidad || ""}`.trim();
  }
  const texto = String(merma.cantidad ?? "").trim();
  if (/^[\d.,]+$/.test(texto)) return `${texto} ${merma.unidad || ""}`.trim();
  return texto || "—";
}
