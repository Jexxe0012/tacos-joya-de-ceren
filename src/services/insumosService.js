/**
 * insumosService — catálogo de insumos y resolvedor de equivalencias.
 *
 * Catálogo compartido por las fichas de Recetas y sus conexiones con
 * Inventario. Expone funciones puras para las conversiones de unidades.
 *
 * Nada de este archivo lee ni escribe en la base de datos: los vínculos y
 * los productos llegan como argumentos. El formulario y las escrituras de
 * vínculos pertenecen al módulo Reportes.
 */

/** Catálogo fijo de insumos. Los ids no cambian: las recetas los guardan. */
const INSUMOS = [
  { id: "tortilla", nombre: "Tortilla de maíz", unidad: "unidad", costoUnitario: 0.06, grupoReporte: "otros" },
  { id: "res", nombre: "Carne de res", unidad: "kg", costoUnitario: 8.00, grupoReporte: "res" },
  { id: "pastor", nombre: "Carne al pastor", unidad: "kg", costoUnitario: 7.00, grupoReporte: "pastor" },
  { id: "pollo", nombre: "Pollo deshebrado", unidad: "kg", costoUnitario: 6.00, grupoReporte: "pollo" },
  { id: "chorizo", nombre: "Chorizo", unidad: "kg", costoUnitario: 6.50, grupoReporte: "otros" },
  { id: "queso", nombre: "Queso duro", unidad: "kg", costoUnitario: 11.00, grupoReporte: "queso" },
  { id: "crema", nombre: "Crema", unidad: "litro", costoUnitario: 3.80, grupoReporte: "otros" },
  { id: "frijol", nombre: "Frijol molido", unidad: "kg", costoUnitario: 2.40, grupoReporte: "otros" },
  { id: "cebolla", nombre: "Cebolla", unidad: "kg", costoUnitario: 1.20, grupoReporte: "otros" },
  { id: "cilantro", nombre: "Cilantro", unidad: "kg", costoUnitario: 2.00, grupoReporte: "otros" },
  { id: "tomate", nombre: "Tomate", unidad: "kg", costoUnitario: 1.50, grupoReporte: "otros" },
  { id: "pina", nombre: "Piña", unidad: "kg", costoUnitario: 1.80, grupoReporte: "otros" },
  { id: "aguacate", nombre: "Aguacate", unidad: "unidad", costoUnitario: 0.55, grupoReporte: "otros" },
  { id: "limon", nombre: "Limón", unidad: "unidad", costoUnitario: 0.08, grupoReporte: "otros" },
  { id: "chile", nombre: "Chile seco", unidad: "kg", costoUnitario: 7.50, grupoReporte: "otros" },
  { id: "salsa-roja", nombre: "Salsa roja de la casa", unidad: "litro", costoUnitario: 2.60, grupoReporte: "otros" },
  { id: "aceite", nombre: "Aceite", unidad: "litro", costoUnitario: 2.90, grupoReporte: "otros" },
  { id: "horchata", nombre: "Horchata en polvo", unidad: "kg", costoUnitario: 4.50, grupoReporte: "otros" },
  { id: "azucar", nombre: "Azúcar", unidad: "kg", costoUnitario: 1.10, grupoReporte: "otros" },
  { id: "vaso", nombre: "Vaso desechable", unidad: "unidad", costoUnitario: 0.07, grupoReporte: "otros" }
];

/** Copia del catálogo. Se copia para que nadie modifique el original. */
export function listarInsumos() {
  return INSUMOS.map(insumo => ({ ...insumo }));
}

/** Un insumo por su id, o null si no está en el catálogo. */
export function obtenerInsumo(id) {
  const insumo = INSUMOS.find(item => item.id === id);
  return insumo ? { ...insumo } : null;
}

/**
 * Deja la unidad en su forma canónica: sin espacios, en minúsculas y con
 * los plurales y sinónimos que ya guardaban los registros antiguos.
 */
export function normalizarUnidad(valor) {
  const clave = String(valor || "").trim().toLowerCase();
  const alias = { litro: "l", litros: "l", unidades: "unidad" };
  return Object.hasOwn(alias, clave) ? alias[clave] : clave;
}

/**
 * Cuántas unidades "destino" hay en una unidad "origen", cuando la
 * conversión es exacta. Devuelve null cuando no se puede deducir: una
 * bolsa, una caja o una densidad necesitan la equivalencia que indique
 * el administrador.
 */
export function equivalenciaAutomatica(origen, destino) {
  const desde = normalizarUnidad(origen);
  const hasta = normalizarUnidad(destino);
  if (!desde || !hasta) return null;
  if (desde === hasta) return 1;
  for (const grupo of [{ kg: 1, g: 0.001, lb: 0.45359237 }, { l: 1, ml: 0.001 }, { unidad: 1, docena: 12 }]) {
    if (Object.hasOwn(grupo, desde) && Object.hasOwn(grupo, hasta)) return grupo[desde] / grupo[hasta];
  }
  return null;
}

/**
 * Relación explícita entre un insumo de Recetas y un producto de
 * Inventario. No busca por parecido de nombre ni cambia ids.
 *
 * productos: Map de id en texto -> producto de Inventario.
 * vinculos:  lista de la colección "vinculosInsumos".
 *
 * Devuelve { insumo, producto, factor } o { error } con la causa, para
 * que Reportes explique qué falta sin inventar un número.
 */
export function resolverVinculo(insumoId, productos, vinculos) {
  const insumo = obtenerInsumo(insumoId);
  const encontrados = vinculos.filter(vinculo => vinculo?.insumoId === insumoId);
  if (!insumo || encontrados.length !== 1) return { error: "sin vínculo único" };

  const vinculo = encontrados[0];
  const producto = productos.get(String(vinculo.productoId));
  if (!producto) return { error: "producto eliminado de Inventario" };

  if (vinculos.some(otro => otro !== vinculo && String(otro?.productoId) === String(producto.id))) {
    return { error: "producto vinculado a más de un ingrediente" };
  }
  if (normalizarUnidad(vinculo.unidadProducto) !== normalizarUnidad(producto.unidad)
    || normalizarUnidad(vinculo.unidadInsumo) !== normalizarUnidad(insumo.unidad)) {
    return { error: "unidad modificada; revisa el vínculo" };
  }

  const factor = Number(vinculo.factor);
  if (!Number.isFinite(factor) || factor <= 0) return { error: "equivalencia inválida" };

  const automatico = equivalenciaAutomatica(producto.unidad, insumo.unidad);
  if (automatico !== null && Math.abs(factor - automatico) > 1e-9 * Math.max(1, automatico)) {
    return { error: "equivalencia incompatible con las unidades" };
  }
  return { insumo, producto, factor };
}

export default { listarInsumos, obtenerInsumo, normalizarUnidad, equivalenciaAutomatica, resolverVinculo };
