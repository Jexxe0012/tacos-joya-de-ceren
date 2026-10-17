"use strict";

const formularioFiltros = document.getElementById("formulario-filtros");
const filtroPeriodo = document.getElementById("filtro-periodo");
const filtroInsumo = document.getElementById("filtro-insumo");
const resumenFiltros = document.getElementById("resumen-filtros");
const camposRango = document.getElementById("rango-personalizado");
const filtroFechaInicio = document.getElementById("filtro-fecha-inicio");
const filtroFechaFin = document.getElementById("filtro-fecha-fin");
const botonAplicarFiltros = document.getElementById("btn-aplicar-filtros");

const periodosPermitidos = ["7", "30"];
const productosPermitidosReporte = new Map();

// Incluye el día actual. Por ejemplo, 7 días del 10 al 16, ambos incluidos.
// Se usan fechas locales para evitar cambios de día por conversiones a UTC.
function calcularRangoPeriodo(dias, fechaActual = new Date()) {
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

function textoFechaReporte(fecha) {
  const anio = String(fecha.getFullYear()).padStart(4, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function fechaLocalReporte(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const fecha = new Date(`${valor}T00:00:00`);
  // Date puede normalizar días inexistentes, por ejemplo el 31 de febrero.
  return Number.isFinite(fecha.getTime()) && textoFechaReporte(fecha) === valor ? fecha : null;
}

function diasEnRango(inicio, fin) {
  // El redondeo mantiene el conteo de días aunque cambie el horario local.
  return Math.round((fin - inicio) / 86400000) + 1;
}

function validarFechaRango(valor) {
  const error = Valida.fecha(valor, { noFutura: true });
  if (error) return error;
  return fechaLocalReporte(valor) ? "" : "Selecciona una fecha válida.";
}

function validarFinRango(valor) {
  if (filtroPeriodo.value !== "personalizado") return "";
  const error = validarFechaRango(valor);
  if (error) return error;
  const inicio = fechaLocalReporte(filtroFechaInicio.value);
  const fin = fechaLocalReporte(valor);
  if (!inicio) return ""; // El error de inicio se muestra en su propio campo.
  if (inicio > fin) return "Selecciona una fecha final igual o posterior a la inicial.";
  if (diasEnRango(inicio, fin) > maxDiasRango) {
    return `Selecciona un máximo de ${maxDiasRango} días, incluyendo ambas fechas.`;
  }
  return "";
}

// Reutiliza los mensajes junto al campo y el foco en el primer error del equipo.
const validarFiltros = Valida.enVivo(formularioFiltros, {
  "filtro-periodo": (valor) => periodosPermitidos.includes(valor) || valor === "personalizado"
    ? ""
    : "Selecciona un período de la lista.",
  "filtro-insumo": (valor) => valor === "todos" || productosPermitidosReporte.has(valor)
    ? ""
    : "Selecciona un producto de la lista.",
  "filtro-fecha-inicio": (valor) => filtroPeriodo.value === "personalizado" ? validarFechaRango(valor) : "",
  "filtro-fecha-fin": validarFinRango
});

function actualizarCamposRango() {
  const personalizado = filtroPeriodo.value === "personalizado";
  camposRango.hidden = !personalizado;
  camposRango.disabled = !personalizado;
  for (const campo of [filtroFechaInicio, filtroFechaFin]) {
    campo.required = personalizado;
    campo.max = UI.fechaHoy();
    if (!personalizado) Valida.limpiar(campo);
  }
}

// Las fechas de ventas y mermas pueden ser días locales o marcas de tiempo ISO.
function fechaRegistroReporte(valor) {
  if (typeof valor !== "string" || !fechaLocalReporte(valor.slice(0, 10))) return null;
  if (valor.length === 10) return fechaLocalReporte(valor);
  if (valor[10] !== "T") return null;
  const instante = new Date(valor);
  return Number.isFinite(instante.getTime())
    ? new Date(instante.getFullYear(), instante.getMonth(), instante.getDate()) : null;
}

function numeroReporte(valor) {
  if (!["string", "number"].includes(typeof valor) || String(valor).trim() === "") return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function unidadReporte(valor) {
  const unidad = String(valor || "").trim().toLowerCase();
  const alias = { litros: "l", litro: "l", unidades: "unidad" };
  return Object.hasOwn(alias, unidad) ? alias[unidad] : unidad;
}

const pesoEnKgReporte = { kg: 1, g: 0.001, lb: 0.45359237 };
const volumenEnLitrosReporte = { l: 1, ml: 0.001 };

function cantidadMermaReporte(merma, producto) {
  // Compatibilidad con registros antiguos de Turnos, por ejemplo "0.5 kg".
  const partes = typeof merma.cantidad === "string"
    ? merma.cantidad.trim().match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)?$/) : null;
  const cantidad = numeroReporte(partes ? partes[1].replace(",", ".") : merma.cantidad);
  const unidad = unidadReporte(merma.unidad || partes?.[2] || producto?.unidad);
  if (cantidad === null || cantidad <= 0) return null;
  if (merma.unidad && partes?.[2] && unidadReporte(merma.unidad) !== unidadReporte(partes[2])) return null;
  return { cantidad, unidad };
}

function costoMermaReporte(cantidad, unidad, producto) {
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

function obtenerDatos(rango) {
  const productos = new Map(DB.getAll("inventario")
    .filter(producto => producto?.id != null && typeof producto.nombre === "string")
    .map(producto => [String(producto.id), producto]));
  const recetas = new Map(DB.getAll("recetas")
    .filter(receta => receta?.id != null)
    .map(receta => [String(receta.id), receta]));
  const catalogo = new Map([...productos].map(([id, producto]) => [id, producto.nombre]));
  const enPeriodo = fecha => fecha && fecha >= rango.inicio && fecha <= rango.fin;
  const ventas = [];
  const mermas = [];
  let descartados = 0;

  for (const venta of DB.getAll("ventas")) {
    const fecha = fechaRegistroReporte(venta?.fecha);
    if (!fecha) { descartados++; continue; }
    if (!enPeriodo(fecha)) continue;
    const cantidad = numeroReporte(venta.cantidad);
    const total = numeroReporte(venta.total);
    if (!venta.recetaId || !Number.isInteger(cantidad) || cantidad < 1 || total === null || total < 0) {
      descartados++; continue;
    }
    const recetaId = String(venta.recetaId);
    ventas.push({ fecha, cantidad, total, recetaId,
      nombre: String(venta.recetaNombre || recetas.get(recetaId)?.nombre || "Receta no disponible"),
      ejemplo: venta.ejemplo === true });
  }

  for (const merma of DB.getAll("mermas")) {
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
  return { ventas, mermas, catalogo, descartados };
}

function actualizarProductosReporte(catalogo) {
  const seleccion = filtroInsumo.value || "todos";
  // Conserva la selección aplicada aunque se elimine un producto mientras la página está abierta.
  for (const [id, nombre] of catalogo) productosPermitidosReporte.set(id, nombre);
  const opciones = [["todos", "Todos los productos"], ...[...productosPermitidosReporte]
    .sort((a, b) => a[1].localeCompare(b[1], "es"))].map(([id, nombre]) => {
      const opcion = document.createElement("option");
      opcion.value = id;
      opcion.textContent = nombre;
      return opcion;
    });
  filtroInsumo.replaceChildren(...opciones);
  filtroInsumo.value = seleccion;
}

function calcularIndicadores(datos, productoSeleccionado) {
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
    eficiencia: null // Requiere una relación explícita entre los insumos de Recetas e Inventario.
  };
}

function mostrarIndicadores(indicadores, dias) {
  const enteros = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 0 });
  const decimales = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 3 });
  const moneda = new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" });
  document.getElementById("valor-ventas").textContent = indicadores.ventas === null ? "Sin datos" : enteros.format(indicadores.ventas);
  document.getElementById("detalle-ventas").textContent = indicadores.ventas === null
    ? "No hay ventas registradas en el período."
    : `Unidades vendidas en ${dias} ${dias === 1 ? "día" : "días"} · ingresos: ${moneda.format(indicadores.ingresos)}.`;
  document.getElementById("valor-mermas").textContent = indicadores.mermaKg === null ? "Sin datos en kg" : `${decimales.format(indicadores.mermaKg)} kg`;
  document.getElementById("detalle-mermas").textContent = !indicadores.cantidadMermas ? "No hay mermas registradas en el período."
    : indicadores.costoMerma === null ? "No hay costos disponibles para estas mermas."
    : `Costo estimado${indicadores.sinCosto ? " parcial" : ""}: ${moneda.format(indicadores.costoMerma)}.`;
  document.getElementById("valor-eficiencia").textContent = "Sin datos";
  document.getElementById("detalle-eficiencia").textContent = "Falta relacionar los insumos de Recetas con los productos de Inventario para comparar los consumos.";
  document.getElementById("estado-datos").textContent = indicadores.ejemplos ? "Incluye ventas de ejemplo" : "Registros del sistema";
}

function calcularHallazgoOperativo(series) {
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

function mostrarHallazgoOperativo(hallazgo) {
  document.getElementById("hallazgo-observacion").textContent = hallazgo.titulo;
  document.getElementById("hallazgo-detalle").textContent = hallazgo.detalle;
  document.getElementById("hallazgo-sugerencia").textContent = hallazgo.sugerencia;
}

function mostrarSeleccionFiltros() {
  const fechaActual = fechaLocalReporte(UI.fechaHoy());
  const rango = filtroPeriodo.value === "personalizado"
    ? { inicio: fechaLocalReporte(filtroFechaInicio.value), fin: fechaLocalReporte(filtroFechaFin.value) }
    : calcularRangoPeriodo(filtroPeriodo.value, fechaActual);
  const datos = obtenerDatos(rango);
  actualizarProductosReporte(datos.catalogo);
  const indicadores = calcularIndicadores(datos, filtroInsumo.value);
  const series = prepararSeriesReportes(datos, rango, filtroInsumo.value);
  mostrarIndicadores(indicadores, diasEnRango(rango.inicio, rango.fin));
  mostrarGraficasReportes(series, rango);
  mostrarHallazgoOperativo(calcularHallazgoOperativo(series));
  const formatoFecha = new Intl.DateTimeFormat("es-SV", { day: "2-digit", month: "2-digit", year: "numeric" });
  const nombreProducto = filtroInsumo.options[filtroInsumo.selectedIndex].textContent;
  resumenFiltros.textContent = `Período seleccionado: ${formatoFecha.format(rango.inicio)} al ${formatoFecha.format(rango.fin)} · ${nombreProducto}.`;
  const avisos = [];
  if (datos.descartados) avisos.push(`Se omitieron ${datos.descartados} registros con fechas, cantidades o importes inválidos.`);
  if (indicadores.sinPeso) avisos.push(`${indicadores.sinPeso} mermas no se suman en kg porque usan otras unidades o no indican su unidad.`);
  if (indicadores.sinCosto) avisos.push(`${indicadores.sinCosto} mermas no tienen un costo comparable en Inventario; el total disponible es parcial.`);
  if (indicadores.ejemplos) avisos.push(`El período incluye ${indicadores.ejemplos} ventas marcadas como ejemplo.`);
  const aviso = document.getElementById("aviso-datos");
  aviso.hidden = avisos.length === 0;
  aviso.textContent = avisos.join(" ");
  document.getElementById("vacio-reportes").hidden = datos.ventas.length > 0 || indicadores.cantidadMermas > 0;
}

// El botón queda bloqueado hasta terminar el aviso para evitar envíos repetidos.
let aplicandoFiltros = false;
formularioFiltros.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (aplicandoFiltros || !validarFiltros()) return;

  aplicandoFiltros = true;
  const desbloquear = Valida.bloquearEnvio(botonAplicarFiltros);
  try {
    mostrarSeleccionFiltros();
    await UI.aviso("Reporte actualizado");
  } finally {
    desbloquear();
    aplicandoFiltros = false;
  }
});

filtroPeriodo.addEventListener("change", actualizarCamposRango);
filtroFechaInicio.addEventListener("input", () => {
  // Corregir el inicio también puede resolver un error de orden o duración en el fin.
  if (filtroFechaFin.classList.contains("is-invalid")) {
    const error = validarFinRango(filtroFechaFin.value);
    if (error) Valida.marcar(filtroFechaFin, error);
    else Valida.limpiar(filtroFechaFin);
  }
});
for (const campo of [filtroFechaInicio, filtroFechaFin]) {
  campo.addEventListener("focus", () => { campo.max = UI.fechaHoy(); });
}

const rangoInicial = calcularRangoPeriodo(7, fechaLocalReporte(UI.fechaHoy()));
filtroFechaInicio.value = textoFechaReporte(rangoInicial.inicio);
filtroFechaFin.value = textoFechaReporte(rangoInicial.fin);
actualizarCamposRango();
mostrarSeleccionFiltros();
