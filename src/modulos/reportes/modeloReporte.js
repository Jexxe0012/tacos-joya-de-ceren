import { fechaRegistroReporte } from "./fechasReporte.js";
import { numeroReporte, unidadReporte, pesoEnKgReporte, volumenEnLitrosReporte } from "./medidas.js";
import { fecha as validarFecha } from "../../utils/validaciones.js";
import { fechaHoyLocal, aTextoLocal as textoFechaReporte, aFechaLocal as fechaLocalReporte, diasEntre } from "../../utils/fechas.js";
import { calcularEficienciaReporte } from "./eficiencia.js";
import { prepararSeriesReportes } from "./series.js";


const periodosPermitidos = ["7", "30"];

// Incluye el día actual. Por ejemplo, 7 días del 10 al 16, ambos incluidos.
// Se usan fechas locales para evitar cambios de día por conversiones a UTC.
export function calcularRangoPeriodo(dias, fechaActual = new Date()) {
  if (!periodosPermitidos.includes(String(dias))) {
    throw new RangeError("El período debe ser de 7 o 30 días.");
  }

  const fin = new Date(
    fechaActual.getFullYear(),
    fechaActual.getMonth(),
    fechaActual.getDate()
  );
  const inicio = new Date(fin);
  inicio.setDate(inicio.getDate() - (Number(dias) - 1));

  return { inicio, fin };
}

// El rango personalizado incluye ambos extremos: del 1 al 1 cuenta como un día.
const maxDiasRango = 90;

export function diasEnRango(inicio, fin) {
  return diasEntre(textoFechaReporte(inicio), textoFechaReporte(fin)) + 1;
}

export function validarFechaRango(valor) {
  const error = validarFecha(valor, { noFutura: true });
  if (error) return error;
  return fechaLocalReporte(valor) ? "" : "Selecciona una fecha válida.";
}

export function validarFinRango(valor, { periodo, fechaInicio }) {
  if (periodo !== "personalizado") return "";
  const error = validarFechaRango(valor);
  if (error) return error;
  const inicio = fechaLocalReporte(fechaInicio);
  const fin = fechaLocalReporte(valor);
  if (!inicio) return ""; // El error de inicio se muestra en su propio campo.
  if (inicio > fin) return "Selecciona una fecha final igual o posterior a la inicial.";
  if (diasEnRango(inicio, fin) > maxDiasRango) {
    return `Selecciona un máximo de ${maxDiasRango} días, incluyendo ambas fechas.`;
  }
  return "";
}

export function cantidadMermaReporte(merma, producto) {
  // Compatibilidad con registros antiguos de Turnos, por ejemplo "0.5 kg".
  const partes = typeof merma.cantidad === "string"
    ? merma.cantidad.trim().match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)?$/) : null;
  const cantidad = numeroReporte(partes ? partes[1].replace(",", ".") : merma.cantidad);
  const unidad = unidadReporte(merma.unidad || partes?.[2] || producto?.unidad);
  if (cantidad === null || cantidad <= 0) return null;
  if (merma.unidad && partes?.[2] && unidadReporte(merma.unidad) !== unidadReporte(partes[2])) return null;
  return { cantidad, unidad };
}

export function costoMermaReporte(cantidad, unidad, producto) {
  const precio = numeroReporte(producto?.costoUnitario);
  if (precio === null || precio < 0 || !unidad) return null;
  const destino = unidadReporte(producto.unidad);
  if (unidad === destino) return cantidad * precio;
  for (const conversiones of [pesoEnKgReporte, volumenEnLitrosReporte]) {
    if (Object.hasOwn(conversiones, unidad) && Object.hasOwn(conversiones, destino)) {
      return cantidad * conversiones[unidad] / conversiones[destino] * precio;
    }
  }
  // Una caja, bolsa o litro no tiene un peso conocido por sí mismo.
  return null;
}

export function obtenerDatos(registros, rango) {
  const productos = new Map(registros.inventario
    .filter(producto => producto?.id != null && typeof producto.nombre === "string")
    .map(producto => [String(producto.id), producto]));
  const recetas = new Map(registros.recetas
    .filter(receta => receta?.id != null)
    .map(receta => [String(receta.id), receta]));
  const catalogo = new Map([...productos].map(([id, producto]) => [id, producto.nombre]));
  // Incluye recetas sin ventas e inactivas para poder consultar su historial.
  // Las preparaciones base (por ejemplo, una salsa) no se venden por separado.
  const catalogoRecetas = new Map([...recetas]
    .filter(([, receta]) => ["taco", "bebida", "complemento"].includes(receta.categoria)
      && typeof receta.nombre === "string" && receta.nombre.trim())
    .map(([id, receta]) => [id, receta.nombre + (receta.estado === "inactiva" ? " (inactiva)" : "")]));
  const enPeriodo = fecha => fecha && fecha >= rango.inicio && fecha <= rango.fin;
  const ventas = [];
  const mermas = [];
  let descartados = 0;

  for (const venta of registros.ventas) {
    const fecha = fechaRegistroReporte(venta?.fecha);
    if (!fecha) { descartados++; continue; }
    const cantidad = numeroReporte(venta.cantidad);
    const total = numeroReporte(venta.total);
    if (!venta.recetaId || !Number.isInteger(cantidad) || cantidad < 1 || total === null || total < 0) {
      if (enPeriodo(fecha)) descartados++;
      continue;
    }
    const recetaId = String(venta.recetaId);
    const nombre = String(venta.recetaNombre || recetas.get(recetaId)?.nombre || "Receta no disponible");
    // Una receta eliminada sigue siendo consultable si tiene ventas guardadas.
    if (!catalogoRecetas.has(recetaId)) catalogoRecetas.set(recetaId, `${nombre} (venta histórica)`);
    if (!enPeriodo(fecha)) continue;
    ventas.push({ fecha, cantidad, total, recetaId, nombre,
      ejemplo: venta.ejemplo === true });
  }

  for (const merma of registros.mermas) {
    const fecha = fechaRegistroReporte(merma?.fecha);
    if (!fecha) { descartados++; continue; }
    // Los registros antiguos solo tienen nombre: se acepta únicamente coincidencia exacta y única.
    const coincidencias = [...productos.values()].filter(producto => producto.nombre === merma.producto);
    const producto = merma.productoId != null ? productos.get(String(merma.productoId))
      : coincidencias.length === 1 ? coincidencias[0] : null;
    const medida = cantidadMermaReporte(merma, producto);
    if (!medida) { if (enPeriodo(fecha)) descartados++; continue; }
    const nombre = typeof merma.producto === "string" && merma.producto.trim()
      ? merma.producto : producto?.nombre || "Producto no disponible";
    const productoId = String(merma.productoId ?? producto?.id ?? `sin-id:${nombre}:${medida.unidad}`);
    catalogo.set(productoId, nombre);
    if (!enPeriodo(fecha)) continue;
    mermas.push({ fecha, productoId, nombre, ...medida,
      kg: Object.hasOwn(pesoEnKgReporte, medida.unidad) ? medida.cantidad * pesoEnKgReporte[medida.unidad] : null,
      costo: costoMermaReporte(medida.cantidad, medida.unidad, producto) });
  }
  return { ventas, mermas, catalogo, catalogoRecetas, descartados,
    productos, recetas, movimientos: registros.movimientos, vinculos: registros.vinculosInsumos };
}

export function calcularIndicadores(datos, productoSeleccionado) {
  const mermas = datos.mermas.filter(merma => productoSeleccionado === "todos" || merma.productoId === productoSeleccionado);
  const conPeso = mermas.filter(merma => merma.kg !== null);
  const conCosto = mermas.filter(merma => merma.costo !== null);
  return {
    ventas: datos.ventas.length ? datos.ventas.reduce((suma, venta) => suma + venta.cantidad, 0) : null,
    ingresos: datos.ventas.length ? datos.ventas.reduce((suma, venta) => suma + venta.total, 0) : null,
    mermaKg: conPeso.length ? conPeso.reduce((suma, merma) => suma + merma.kg, 0) : null,
    costoMerma: conCosto.length ? conCosto.reduce((suma, merma) => suma + merma.costo, 0) : null,
    sinPeso: mermas.length - conPeso.length,
    sinCosto: mermas.length - conCosto.length,
    cantidadMermas: mermas.length,
    ejemplos: datos.ventas.filter(venta => venta.ejemplo).length,
    eficiencia: null // Se completa con las fichas, vínculos y salidas de cocina del mismo reporte.
  };
}

export function presentarIndicadoresReporte(indicadores, dias) {
  const enteros = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 0 });
  const decimales = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 3 });
  const moneda = new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" });
  const ventas = indicadores.ventas === null ? "Sin datos" : enteros.format(indicadores.ventas);
  const detalleVentas = indicadores.ventas === null
    ? "No hay ventas registradas para la receta y el período seleccionados."
    : `Unidades vendidas en ${dias} ${dias === 1 ? "día" : "días"} · ingresos: ${moneda.format(indicadores.ingresos)}.`;
  const mermas = indicadores.mermaKg === null ? "Sin datos en kg" : `${decimales.format(indicadores.mermaKg)} kg`;
  const detalleMermas = !indicadores.cantidadMermas ? "No hay mermas registradas en el período."
    : indicadores.costoMerma === null ? "No hay costos disponibles para estas mermas."
    : `Costo estimado${indicadores.sinCosto ? " parcial" : ""}: ${moneda.format(indicadores.costoMerma)}.`;
  const eficiencia = indicadores.eficiencia === null ? "Sin datos"
    : `${new Intl.NumberFormat("es-SV", { maximumFractionDigits: 1 }).format(indicadores.eficiencia)}%`;
  const detalleEficiencia = indicadores.comparacion.detalle;
  const filas = indicadores.comparacion.filas.map(fila => ({
    id: fila.productoId,
    nombre: fila.nombre,
    estandar: `${decimales.format(fila.estandarKg)} kg`,
    real: fila.realKg === null ? "Sin salidas" : `${decimales.format(fila.realKg)} kg`
  }));
  return { ventas, detalleVentas, mermas, detalleMermas, eficiencia, detalleEficiencia, filas };
}

export function calcularHallazgoOperativo(series) {
  const mermas = series.mermas.filter(merma => merma.kg !== null);
  if (!series.mermas.length) return { titulo: "Sin registros para analizar",
    detalle: "No hay mermas del producto y período seleccionados.", sugerencia: "Selecciona otro período o registra las mermas para analizarlas." };
  if (!mermas.length) return { titulo: "Mermas en otras unidades",
    detalle: "Las mermas registradas no tienen una conversión conocida a kilogramos.",
    sugerencia: "Consulta las cantidades y los costos en la tabla de mermas." };
  const mayor = Math.max(...mermas.map(merma => merma.kg));
  const principales = mermas.filter(merma => Math.abs(merma.kg - mayor) < 1e-9);
  const nombres = principales.map(merma => merma.nombre).join(", ");
  const formato = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 3 });
  return { titulo: principales.length > 1 ? "Productos con igual merma máxima" : "Producto con mayor merma en kg",
    detalle: `${nombres}: ${formato.format(mayor)} kg${principales.length > 1 ? " cada uno" : ""}, entre los registros con peso conocido.`,
    sugerencia: "Revisa los registros de preparación y porcionado de estos productos antes de ajustar la producción." };
}

export function opcionesFiltroReporte(catalogo, inicial) {
  return [inicial, ...[...catalogo].sort((a, b) => a[1].localeCompare(b[1], "es"))];
}

export function catalogosReporte(registros) {
  const hoy = fechaLocalReporte(fechaHoyLocal());
  const datos = obtenerDatos(registros, calcularRangoPeriodo(30, hoy));
  return {
    productos: opcionesFiltroReporte(datos.catalogo, ["todos", "Todos los productos"]),
    recetas: opcionesFiltroReporte(datos.catalogoRecetas, ["todas", "Todas las recetas"])
  };
}

export function validarFiltrosReporte(filtros, catalogos) {
  const errores = {};
  if (![...periodosPermitidos, "personalizado"].includes(filtros.periodo)) errores.periodo = "Selecciona un período de la lista.";
  if (!catalogos.productos.some(([id]) => id === filtros.insumo)) errores.insumo = "Selecciona un producto de la lista.";
  if (!catalogos.recetas.some(([id]) => id === filtros.receta)) errores.receta = "Selecciona una receta de la lista.";
  if (filtros.periodo === "personalizado") {
    errores.fechaInicio = validarFechaRango(filtros.fechaInicio);
    errores.fechaFin = validarFinRango(filtros.fechaFin, filtros);
  }
  return Object.fromEntries(Object.entries(errores).filter(([, mensaje]) => mensaje));
}

export function filtrosInicialesReporte() {
  const { inicio, fin } = calcularRangoPeriodo(7, fechaLocalReporte(fechaHoyLocal()));
  return { periodo: "7", insumo: "todos", receta: "todas",
    fechaInicio: textoFechaReporte(inicio), fechaFin: textoFechaReporte(fin) };
}

export function calcularReporte({ periodo, insumo, receta, fechaInicio, fechaFin }, registros) {
  const fechaActual = fechaLocalReporte(fechaHoyLocal());
  const rango = periodo === "personalizado"
    ? { inicio: fechaLocalReporte(fechaInicio), fin: fechaLocalReporte(fechaFin) }
    : calcularRangoPeriodo(periodo, fechaActual);
  const datos = obtenerDatos(registros, rango);
  // Los indicadores, las gráficas y el PDF comparten las mismas ventas filtradas.
  const datosFiltrados = { ...datos,
    ventas: datos.ventas.filter(venta => receta === "todas" || venta.recetaId === receta) };
  const indicadores = calcularIndicadores(datosFiltrados, insumo);
  indicadores.comparacion = calcularEficienciaReporte(datosFiltrados, rango, insumo, receta);
  indicadores.eficiencia = indicadores.comparacion.valor;
  const series = prepararSeriesReportes(datosFiltrados, rango, insumo);
  const hallazgo = calcularHallazgoOperativo(series);
  const formatoFecha = new Intl.DateTimeFormat("es-SV", { day: "2-digit", month: "2-digit", year: "numeric" });
  const nombreProducto = datos.catalogo.get(insumo) ?? "Todos los productos";
  const nombreReceta = datos.catalogoRecetas.get(receta) ?? "Todas las recetas";
  const resumen = `Período seleccionado: ${formatoFecha.format(rango.inicio)} al ${formatoFecha.format(rango.fin)} · Receta: ${nombreReceta} · Merma: ${nombreProducto}.`;
  const alcance = `Ventas, ingresos y demanda: ${nombreReceta}. Las mermas se filtran por producto de forma independiente; no se atribuyen a la receta.`;
  const avisos = [...indicadores.comparacion.avisos];
  if (datos.descartados) avisos.push(`Se omitieron ${datos.descartados} registros con fechas, cantidades o importes inválidos.`);
  if (indicadores.sinPeso) avisos.push(`${indicadores.sinPeso} ${indicadores.sinPeso === 1 ? "merma no se suma" : "mermas no se suman"} en kg por tener otras unidades o no indicar su unidad.`);
  if (indicadores.sinCosto) avisos.push(`${indicadores.sinCosto} ${indicadores.sinCosto === 1 ? "merma no tiene" : "mermas no tienen"} un costo comparable en Inventario; el total disponible es parcial.`);
  if (indicadores.ejemplos) avisos.push(`El período incluye ${indicadores.ejemplos} ${indicadores.ejemplos === 1 ? "venta marcada" : "ventas marcadas"} como ejemplo.`);
  const sinDatos = !datosFiltrados.ventas.length && !indicadores.cantidadMermas;
  return { rango, producto: nombreProducto, receta: nombreReceta, alcance, indicadores,
    series, hallazgo, avisos, resumen, sinDatos };
}
