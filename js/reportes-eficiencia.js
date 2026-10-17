"use strict";

// Se comparan pesos, no se suman kg con litros o unidades. Las fichas son las actuales.
function calcularEficienciaReporte(datos, rango, productoId, recetaId) {
  const filas = new Map();
  const problemas = new Set();
  const avisos = [];
  const resultado = detalle => ({ valor: null, detalle, filas: [...filas.values()], avisos });
  if (!datos.ventas.length) return resultado("No hay ventas para calcular el consumo estándar del período.");
  if (recetaId !== "todas") return resultado("Las salidas de cocina no identifican la receta. Selecciona Todas las recetas para comparar consumos por producto.");
  const vinculos = datos.vinculos;
  for (const venta of datos.ventas) {
    const receta = datos.recetas.get(venta.recetaId);
    const porciones = numeroReporte(receta?.porciones);
    if (!receta || porciones === null || porciones <= 0 || !Array.isArray(receta.ingredientes) || !receta.ingredientes.length) {
      problemas.add(`Falta una ficha válida de ${venta.nombre}`);
      continue;
    }
    const usados = new Set();
    for (const linea of receta.ingredientes) {
      const insumo = CatalogoInsumos.obtener(linea?.insumoId);
      const cantidad = numeroReporte(linea?.cantidad);
      if (!insumo || cantidad === null || cantidad <= 0 || usados.has(insumo.id)) {
        problemas.add(`Revisa los ingredientes de ${receta.nombre}`);
        continue;
      }
      usados.add(insumo.id);
      const unidad = InsumosInventario.unidad(insumo.unidad);
      if (!Object.hasOwn(pesoEnKgReporte, unidad)) continue;
      const enlace = InsumosInventario.resolver(insumo.id, datos.productos, vinculos);
      if (enlace.error) {
        if (productoId === "todos") problemas.add(`${insumo.nombre}: ${enlace.error}`);
        continue;
      }
      const id = String(enlace.producto.id);
      if (productoId !== "todos" && productoId !== id) continue;
      const estandarKg = cantidad * venta.cantidad / porciones * pesoEnKgReporte[unidad];
      if (!Number.isFinite(estandarKg)) { problemas.add(`Revisa las cantidades de ${receta.nombre}`); continue; }
      const fila = filas.get(id) || { productoId: id, nombre: enlace.producto.nombre, estandarKg: 0, realKg: null,
        unidadInsumo: insumo.unidad, factor: enlace.factor, unidadProducto: enlace.producto.unidad };
      fila.estandarKg += estandarKg;
      filas.set(id, fila);
    }
  }
  if (problemas.size) return resultado(`Completa las conexiones y fichas: ${[...problemas].slice(0, 3).join("; ")}${problemas.size > 3 ? `; y ${problemas.size - 3} más` : ""}.`);
  if (!filas.size) return resultado("No hay ingredientes de peso vinculados al producto y las ventas del período. Revisa las conexiones con Inventario.");

  let unidadesAntiguas = 0;
  for (const movimiento of datos.movimientos) {
    if (movimiento?.tipo !== "salida" || movimiento.motivo !== "Consumo en cocina") continue;
    const fila = filas.get(String(movimiento.productoId));
    if (!fila) continue; // La comparación abarca los ingredientes usados por las ventas del período.
    const fecha = fechaRegistroReporte(movimiento.fecha);
    if (!fecha) { problemas.add(`Salida sin fecha válida de ${fila.nombre}`); continue; }
    if (fecha < rango.inicio || fecha > rango.fin) continue;
    const cantidad = numeroReporte(movimiento.cantidad);
    if (cantidad === null || cantidad <= 0) { problemas.add(`Salida con cantidad inválida de ${fila.nombre}`); continue; }
    const unidad = InsumosInventario.unidad(movimiento.unidad || fila.unidadProducto);
    const aIngrediente = InsumosInventario.equivalenciaAutomatica(unidad, fila.unidadInsumo);
    const aProducto = InsumosInventario.equivalenciaAutomatica(unidad, fila.unidadProducto);
    const factor = aIngrediente ?? (aProducto === null ? null : aProducto * fila.factor);
    if (factor === null) { problemas.add(`Salida sin equivalencia de ${fila.nombre}`); continue; }
    const kg = cantidad * factor * pesoEnKgReporte[InsumosInventario.unidad(fila.unidadInsumo)];
    if (!Number.isFinite(kg)) { problemas.add(`Salida con cantidad inválida de ${fila.nombre}`); continue; }
    if (!movimiento.unidad) unidadesAntiguas++;
    fila.realKg = (fila.realKg ?? 0) + kg;
  }
  if (unidadesAntiguas) avisos.push(`Eficiencia: ${unidadesAntiguas} ${unidadesAntiguas === 1 ? "movimiento antiguo usa" : "movimientos antiguos usan"} la unidad actual de Inventario porque no guardaron su unidad original.`);
  for (const fila of filas.values()) {
    if (fila.realKg === null || fila.realKg <= 0) problemas.add(`Faltan salidas de Consumo en cocina para ${fila.nombre}`);
  }
  if (problemas.size) return resultado(`${[...problemas].slice(0, 3).join("; ")}${problemas.size > 3 ? `; y ${problemas.size - 3} más` : ""}.`);
  const estandarKg = [...filas.values()].reduce((suma, fila) => suma + fila.estandarKg, 0);
  const realKg = [...filas.values()].reduce((suma, fila) => suma + fila.realKg, 0);
  const valor = estandarKg / realKg * 100;
  if (!Number.isFinite(valor) || !Number.isFinite(estandarKg) || !Number.isFinite(realKg)) return resultado("Revisa las cantidades: no se puede calcular una comparación válida.");
  const formato = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 3 });
  return { valor, estandarKg, realKg, filas: [...filas.values()], avisos,
    detalle: `${formato.format(estandarKg)} kg estándar ÷ ${formato.format(realKg)} kg de salidas de cocina. Solo ingredientes de peso vinculados usados por las ventas, con las fichas actuales.` };
}
