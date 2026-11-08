import { db } from "../../services/storage.js";
import { leerSesion } from "../../services/authService.js";
import { obtenerInsumo, equivalenciaAutomatica } from "../../services/insumosService.js";

export function validarVinculo(valores, registros) {
  const errores = {};
  const insumo = obtenerInsumo(valores.insumoId);
  const producto = registros.inventario.find(item => String(item.id) === valores.productoId);
  if (!insumo) errores.insumoId = "Selecciona un ingrediente de Recetas.";
  if (!producto) errores.productoId = "Selecciona un producto de Inventario.";
  if (registros.vinculosInsumos.some(item => item?.insumoId !== valores.insumoId && String(item?.productoId) === valores.productoId)) {
    errores.productoId = "Este producto ya está vinculado a otro ingrediente.";
  }
  const factor = Number(valores.factor);
  if (!valores.factor || !Number.isFinite(factor) || factor <= 0 || factor > 1000000) {
    errores.factor = "Indica una equivalencia mayor que cero y de hasta 1,000,000.";
  } else if (insumo && producto) {
    const automatico = equivalenciaAutomatica(producto.unidad, insumo.unidad);
    if (automatico !== null && Math.abs(factor - automatico) > 1e-9 * Math.max(1, automatico)) {
      errores.factor = "La equivalencia debe corresponder a las unidades seleccionadas.";
    }
  }
  return errores;
}

function administrador() {
  const sesion = leerSesion();
  if (sesion?.rol !== "admin") throw new Error("Inicia sesión como administrador para gestionar las conexiones.");
  return sesion;
}

export function guardarVinculo(valores) {
  const sesion = administrador();
  const registros = { inventario: db.getAll("inventario"), vinculosInsumos: db.getAll("vinculosInsumos") };
  if (Object.keys(validarVinculo(valores, registros)).length) throw new Error("Revisa los campos de la conexión.");
  const insumo = obtenerInsumo(valores.insumoId);
  const producto = registros.inventario.find(item => String(item.id) === valores.productoId);
  const datos = {
    insumoId: insumo.id, productoId: String(producto.id), factor: Number(valores.factor),
    unidadInsumo: insumo.unidad, unidadProducto: producto.unidad,
    actualizadoPor: sesion.id, actualizadoEn: new Date().toISOString()
  };
  return db.enLote(["vinculosInsumos"], () => {
    const anteriores = registros.vinculosInsumos.filter(item => item?.insumoId === insumo.id);
    if (!anteriores.length) return db.create("vinculosInsumos", datos);
    const guardado = db.update("vinculosInsumos", anteriores[0].id, datos);
    anteriores.slice(1).forEach(item => db.remove("vinculosInsumos", item.id));
    return guardado;
  });
}

export function quitarVinculo(insumoId) {
  administrador();
  db.enLote(["vinculosInsumos"], () => {
    db.getAll("vinculosInsumos").filter(item => item?.insumoId === insumoId)
      .forEach(item => db.remove("vinculosInsumos", item.id));
  });
}
