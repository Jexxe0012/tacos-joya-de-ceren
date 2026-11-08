/**
 * recetasService — categorías, cálculos y operaciones sobre recetas.
 *
 * Todo lo que no es interfaz: el catálogo de categorías, los límites del
 * formulario, los cálculos de costo y margen, y las escrituras. Las
 * pantallas importan de aquí y no repiten ninguna fórmula.
 *
 * Los ids de receta y de categoría no cambian: Ventas y Reportes los
 * guardan en sus registros.
 */

import { db } from "../../services/storage.js";
import { listarInsumos, obtenerInsumo } from "../../services/insumosService.js";

export const COLECCION = "recetas";

/** Las categorías del menú. "base" no se vende por separado. */
export const CATEGORIAS = [
  { id: "taco", nombre: "Taco", seVende: true },
  { id: "bebida", nombre: "Bebida", seVende: true },
  { id: "complemento", nombre: "Complemento", seVende: true },
  { id: "base", nombre: "Preparación base", seVende: false }
];

export const LIMITES = {
  nombreMin: 3,
  nombreMax: 60,
  porcionesMin: 1,
  porcionesMax: 200,
  tiempoMin: 1,
  tiempoMax: 240,
  precioMin: 0.05,
  precioMax: 100,
  cantidadMin: 0.001,
  cantidadMax: 1000,
  preparacionMin: 20,
  preparacionMax: 1000,
  ingredientesMax: 15,
  busquedaMax: 60
};

/**
 * Nombre de receta: letras (con tildes y ñ), números, espacios y los
 * signos que se usan en nombres de platos, como "Horchata de 12 onzas".
 */
export const PATRON_NOMBRE = /^[\p{L}\p{N} .,'()&-]+$/u;

/** Búsqueda: lo mismo, sin símbolos que no aparecen en ningún nombre. */
export const PATRON_BUSQUEDA = /^[\p{L}\p{N}\s.,'-]*$/u;

export const moneda = new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" });
export const enteros = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 0 });
export const decimales = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 3 });
export const fechaCorta = new Intl.DateTimeFormat("es-SV", { day: "2-digit", month: "2-digit", year: "numeric" });

/**
 * Deja un texto listo para comparar: minúsculas, sin tildes y con un
 * solo espacio entre palabras. Así "Taco  al PASTÓR " y "taco al pastor"
 * son el mismo texto.
 */
export function normalizar(texto) {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function nombreCategoria(categoriaId) {
  return CATEGORIAS.find(categoria => categoria.id === categoriaId)?.nombre ?? "Sin categoría";
}

export function categoriaSeVende(categoriaId) {
  const categoria = CATEGORIAS.find(item => item.id === categoriaId);
  return categoria ? categoria.seVende : true;
}

/** Cantidad con su unidad, y el equivalente en gramos o mililitros si es menor que uno. */
export function formatoCantidad(cantidad, unidad) {
  if (unidad === "unidad") {
    return `${decimales.format(cantidad)} ${cantidad === 1 ? "unidad" : "unidades"}`;
  }
  const base = `${decimales.format(cantidad)} ${unidad}`;
  if (unidad === "kg" && cantidad < 1) return `${base} (${enteros.format(cantidad * 1000)} g)`;
  if (unidad === "litro" && cantidad < 1) return `${base} (${enteros.format(cantidad * 1000)} ml)`;
  return base;
}

// ---------- Cálculos ----------

export function costoTotal(receta) {
  return (receta.ingredientes || []).reduce((suma, linea) => {
    const insumo = obtenerInsumo(linea.insumoId);
    if (!insumo) return suma;
    return suma + Number(linea.cantidad) * insumo.costoUnitario;
  }, 0);
}

export function costoPorPorcion(receta) {
  const porciones = Number(receta.porciones) || 1;
  return costoTotal(receta) / porciones;
}

/** Margen de una porción. null cuando la categoría no se vende o falta el precio. */
export function margenPorPorcion(receta) {
  if (!categoriaSeVende(receta.categoria)) return null;
  const precio = Number(receta.precioVenta) || 0;
  if (precio <= 0) return null;
  return precio - costoPorPorcion(receta);
}

export function margenPorcentaje(receta) {
  const margen = margenPorPorcion(receta);
  if (margen === null) return null;
  return margen / Number(receta.precioVenta) * 100;
}

/** Consumo estándar por porción, agrupado como lo esperan los reportes. */
export function consumoEstandarPorGrupo(receta) {
  const porciones = Number(receta.porciones) || 1;
  const acumulado = {};
  for (const linea of receta.ingredientes || []) {
    const insumo = obtenerInsumo(linea.insumoId);
    if (!insumo || insumo.unidad !== "kg") continue;
    acumulado[insumo.grupoReporte] = (acumulado[insumo.grupoReporte] || 0) + Number(linea.cantidad) / porciones;
  }
  return acumulado;
}

// ---------- Consultas ----------

export function listarRecetas() {
  return db.getAll(COLECCION);
}

export function listarActivas() {
  return listarRecetas().filter(receta => receta.estado === "activa");
}

export function obtenerReceta(id) {
  return db.getById(COLECCION, id);
}

/** El catálogo de insumos, para los formularios de receta. */
export function catalogoInsumos() {
  return listarInsumos();
}

/**
 * Busca si el nombre ya existe, sin importar mayúsculas, tildes ni
 * espacios de más. Al editar, la receta no choca consigo misma.
 */
export function recetaConMismoNombre(nombre, idActual = "") {
  const buscado = normalizar(nombre);
  return listarRecetas().find(receta =>
    String(receta.id) !== String(idActual) && normalizar(receta.nombre) === buscado
  );
}

/** Cuántas ventas guardadas apuntan a esa receta. */
export function ventasDeReceta(id) {
  return db.getAll("ventas").filter(venta => String(venta.recetaId) === String(id)).length;
}

/**
 * Filtra y ordena el catálogo con los criterios de la pantalla.
 * El texto busca en el nombre de la receta y en el de sus ingredientes.
 */
export function filtrarRecetas(recetas, { texto = "", categoria = "todas", estado = "todos", orden = "nombre" } = {}) {
  const buscado = normalizar(texto);

  const encontradas = recetas.filter(receta => {
    if (categoria !== "todas" && receta.categoria !== categoria) return false;
    if (estado !== "todos" && receta.estado !== estado) return false;
    if (!buscado) return true;
    if (normalizar(receta.nombre).includes(buscado)) return true;
    return (receta.ingredientes || []).some(linea => {
      const insumo = obtenerInsumo(linea.insumoId);
      return insumo && normalizar(insumo.nombre).includes(buscado);
    });
  });

  return [...encontradas].sort((a, b) => {
    if (orden === "costo") return costoPorPorcion(a) - costoPorPorcion(b);
    if (orden === "margen") return (margenPorPorcion(b) ?? -Infinity) - (margenPorPorcion(a) ?? -Infinity);
    if (orden === "categoria") {
      const comparacion = nombreCategoria(a.categoria).localeCompare(nombreCategoria(b.categoria), "es");
      if (comparacion !== 0) return comparacion;
    }
    return String(a.nombre).localeCompare(String(b.nombre), "es");
  });
}

// ---------- Escrituras ----------

/**
 * Guarda una receta nueva o los cambios de una existente.
 * Devuelve la receta guardada. Propaga el error si la escritura falla,
 * para que la pantalla no informe un éxito que no ocurrió.
 */
export function guardarReceta({ id = "", datos, autor }) {
  const ahora = Date.now();
  if (id) return db.update(COLECCION, id, { ...datos, actualizadaEn: ahora });
  return db.create(COLECCION, { ...datos, creadaPor: autor, creadaEn: ahora, actualizadaEn: ahora });
}

export function eliminarReceta(id) {
  return db.remove(COLECCION, id);
}
