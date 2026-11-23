import { aTextoLocal as textoFechaReporte, diasEntre } from "../../utils/fechas.js";
const diasEnRango = (inicio, fin) => diasEntre(textoFechaReporte(inicio), textoFechaReporte(fin)) + 1;



export function prepararSeriesReportes(datos, rango, productoSeleccionado) {
  const ventasPorFecha = new Map();
  const ingresosPorReceta = new Map();
  for (const venta of datos.ventas) {
    const fecha = textoFechaReporte(venta.fecha);
    ventasPorFecha.set(fecha, (ventasPorFecha.get(fecha) || 0) + venta.cantidad);
    const ingreso = ingresosPorReceta.get(venta.recetaId) || { nombre: venta.nombre, valor: 0 };
    ingreso.valor += venta.total;
    ingresosPorReceta.set(venta.recetaId, ingreso);
  }
  const ventas = [];
  const historialSemana = Array.from({ length: 7 }, () => []);
  for (const fecha = new Date(rango.inicio); fecha <= rango.fin; fecha.setDate(fecha.getDate() + 1)) {
    const valor = ventasPorFecha.get(textoFechaReporte(fecha)) ?? null;
    ventas.push({ fecha: new Date(fecha), valor });
    if (valor !== null) historialSemana[fecha.getDay()].push(valor);
  }
  const demanda = Array.from({ length: 7 }, (_, indice) => {
    const fecha = new Date(rango.fin);
    fecha.setDate(fecha.getDate() + indice + 1);
    const historial = historialSemana[fecha.getDay()];
    return { fecha, valor: historial.length ? Math.round(historial.reduce((suma, valor) => suma + valor, 0) / historial.length) : null };
  });
  const porProducto = new Map();
  for (const merma of datos.mermas) {
    if (productoSeleccionado !== "todos" && productoSeleccionado !== merma.productoId) continue;
    const producto = porProducto.get(merma.productoId) || { nombre: merma.nombre, kg: null, costo: null, cantidades: new Map() };
    if (merma.kg !== null) producto.kg = (producto.kg || 0) + merma.kg;
    if (merma.costo !== null) producto.costo = (producto.costo || 0) + merma.costo;
    const unidad = merma.unidad || "sin unidad";
    producto.cantidades.set(unidad, (producto.cantidades.get(unidad) || 0) + merma.cantidad);
    porProducto.set(merma.productoId, producto);
  }
  const mermas = [...porProducto.values()].sort((a, b) => (b.kg ?? -1) - (a.kg ?? -1));
  return { ventas, demanda, mermas, ingresos: [...ingresosPorReceta.values()].sort((a, b) => b.valor - a.valor) };
}

export function valorTablaReporte(valor, unidad) {
  if (valor === null) return "Sin datos";
  return new Intl.NumberFormat("es-SV", unidad === "USD"
    ? { style: "currency", currency: "USD" } : { maximumFractionDigits: unidad === "kg" ? 3 : 0 }).format(valor);
}

export function datosGraficasReporte(series, rango) {
  const fecha = new Intl.DateTimeFormat("es-SV", { weekday: "short", day: "numeric", month: "short" });
  const dias = diasEnRango(rango.inicio, rango.fin);
  const especificaciones = [
    { tipo: "ventas", datos: series.ventas, variableColor: "--text", unidad: "unidades", horizontal: false, tipoGrafica: "line",
      titulo: dias === 7 ? "Ventas semanales" : "Ventas del período",
      descripcion: `Unidades vendidas por día · ${dias} ${dias === 1 ? "día" : "días"} del período seleccionado.`
        + (dias > 7 ? " Desliza horizontalmente para ver todos los días." : "") },
    { tipo: "ingresos", datos: series.ingresos, variableColor: "--success", unidad: "USD", horizontal: true, tipoGrafica: "bar",
      titulo: "Ingresos por receta", descripcion: "Suma del total registrado en las ventas de cada receta." },
    { tipo: "demanda", datos: series.demanda, variableColor: "--accent", unidad: "unidades estimadas", horizontal: false, tipoGrafica: "bar",
      titulo: "Demanda prevista", descripcion: "7 días posteriores al período · promedio de ventas por día de la semana con registros." }
  ];

  return Object.fromEntries(especificaciones.map(({ datos, ...grafica }) => {
    const etiquetas = datos.map(dato => grafica.horizontal ? dato.nombre : fecha.format(dato.fecha));
    const valores = datos.map(dato => dato.valor);
    const filas = valores.some(valor => valor !== null)
      ? datos.map((dato, indice) => [etiquetas[indice], valorTablaReporte(dato.valor, grafica.unidad)]) : [];
    return [grafica.tipo, { ...grafica, etiquetas, valores, filas,
      anchoMinimo: grafica.tipo === "ventas" && dias > 7 ? dias * 80 : 0 }];
  }));
}

export function datosGraficaMermasReporte(mermas, unidad) {
  const medida = unidad === "USD" ? "costo" : "kg";
  const datos = [...mermas].sort((a, b) => (b[medida] ?? -1) - (a[medida] ?? -1));
  const cantidad = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 3 });
  const filas = mermas.map(dato => [dato.nombre,
    [...dato.cantidades].map(([unidadCantidad, valor]) => `${cantidad.format(valor)} ${unidadCantidad}`).join(" + "),
    dato.kg === null ? "Sin conversión a kg" : valorTablaReporte(dato.kg, "kg"), valorTablaReporte(dato.costo, "USD")]);
  return {
    tipo: "mermas", unidad, variableColor: "--danger", horizontal: true, tipoGrafica: "bar", anchoMinimo: 0,
    titulo: "Mermas por producto",
    descripcion: "Mermas del período y del producto seleccionado. Los kg incluyen solo unidades de peso convertibles.",
    etiquetas: datos.map(dato => dato.nombre), valores: datos.map(dato => dato[medida]), filas
  };
}
