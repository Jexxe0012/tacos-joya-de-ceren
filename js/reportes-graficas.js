"use strict";

function prepararSeriesReportes(datos, rango, productoSeleccionado) {
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

const graficasReportes = new Map();
let seriesMermasActuales = [];
let medidaMermasReporte = "kg";

function valorTablaReporte(valor, unidad) {
  if (valor === null) return "Sin datos";
  return new Intl.NumberFormat("es-SV", unidad === "USD"
    ? { style: "currency", currency: "USD" } : { maximumFractionDigits: unidad === "kg" ? 3 : 0 }).format(valor);
}

function mostrarTablaReporte(tipo, filas) {
  const tabla = document.getElementById(`tabla-${tipo}`);
  tabla.replaceChildren();
  if (!filas.length) {
    const fila = document.createElement("tr");
    const celda = document.createElement("td");
    celda.colSpan = tipo === "mermas" ? 4 : 2;
    celda.textContent = "Sin datos en este período";
    fila.append(celda);
    tabla.append(fila);
    return;
  }
  for (const valores of filas) {
    const fila = document.createElement("tr");
    valores.forEach((texto, indice) => {
      const celda = document.createElement(indice ? "td" : "th");
      if (!indice) celda.scope = "row";
      celda.textContent = texto;
      fila.append(celda);
    });
    tabla.append(fila);
  }
}

function actualizarGraficaReporte(tipo, etiquetas, valores, color, unidad, horizontal = false, tipoGrafica = "bar") {
  const canvas = document.getElementById(`grafica-${tipo}`);
  const hayDatos = valores.some(valor => valor !== null);
  const disponible = typeof Chart !== "undefined";
  document.getElementById(`vacio-${tipo}`).hidden = hayDatos;
  canvas.parentElement.hidden = !hayDatos || !disponible;
  const ventasExtendidas = tipo === "ventas" && etiquetas.length > 7;
  if (tipo === "ventas") {
    canvas.parentElement.style.minWidth = ventasExtendidas ? `${etiquetas.length * 80}px` : "0px";
    document.getElementById("desplazamiento-ventas").scrollLeft = 0;
  }
  if (!hayDatos) {
    if (graficasReportes.has(tipo)) {
      graficasReportes.get(tipo).destroy();
      graficasReportes.delete(tipo);
    }
    return;
  }
  if (!disponible) {
    document.getElementById(`datos-${tipo}`).open = true;
    return;
  }
  if (graficasReportes.has(tipo)) {
    const grafica = graficasReportes.get(tipo);
    grafica.data.labels = etiquetas;
    Object.assign(grafica.data.datasets[0], { data: valores, label: unidad });
    grafica.options.scales[horizontal ? "x" : "y"].title.text = unidad;
    if (tipo === "ventas") {
      grafica.options.scales.x.ticks.autoSkip = !ventasExtendidas;
      grafica.options.scales.x.ticks.maxTicksLimit = ventasExtendidas ? etiquetas.length : 7;
    }
    grafica.resize();
    grafica.update("none");
    return;
  }
  const estilos = getComputedStyle(document.body);
  const texto = estilos.getPropertyValue("--text").trim();
  const ejeValores = { beginAtZero: true, title: { display: true, text: unidad, color: texto },
    ticks: { color: texto, precision: horizontal ? 2 : 0 },
    grid: { color: estilos.getPropertyValue("--bs-border-color").trim() } };
  const ejeEtiquetas = { ticks: { color: texto, maxRotation: 0, autoSkip: !horizontal && !ventasExtendidas,
    maxTicksLimit: ventasExtendidas ? etiquetas.length : 7 }, grid: { display: false } };
  graficasReportes.set(tipo, new Chart(canvas, {
    type: tipoGrafica,
    data: { labels: etiquetas, datasets: [{ label: unidad, data: valores, backgroundColor: color,
      borderColor: color, borderRadius: 5, maxBarThickness: horizontal ? 20 : 38,
      pointRadius: 3, tension: 0.2, spanGaps: false }] },
    options: { responsive: true, maintainAspectRatio: false, animation: false, locale: "es-SV",
      indexAxis: horizontal ? "y" : "x",
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: contexto => {
        const valor = contexto.chart.options.indexAxis === "y" ? contexto.parsed.x : contexto.parsed.y;
        const unidadActual = contexto.dataset.label;
        return unidadActual === "USD" ? valorTablaReporte(valor, unidadActual)
          : `${valorTablaReporte(valor, unidadActual)} ${unidadActual}`;
      } } } },
      scales: { x: horizontal ? ejeValores : ejeEtiquetas, y: horizontal ? ejeEtiquetas : ejeValores }
    }
  }));
}

function mostrarGraficaMermas() {
  const enDolares = medidaMermasReporte === "USD";
  const datos = [...seriesMermasActuales].sort((a, b) => (b[enDolares ? "costo" : "kg"] ?? -1) - (a[enDolares ? "costo" : "kg"] ?? -1));
  const color = getComputedStyle(document.body).getPropertyValue("--danger").trim();
  actualizarGraficaReporte("mermas", datos.map(dato => dato.nombre), datos.map(dato => enDolares ? dato.costo : dato.kg), color, medidaMermasReporte, true);
  for (const [id, medida] of [["mermas-en-kg", "kg"], ["mermas-en-usd", "USD"]]) {
    document.getElementById(id).setAttribute("aria-pressed", String(medidaMermasReporte === medida));
    document.getElementById(id).classList.toggle("active", medidaMermasReporte === medida);
  }
}

function mostrarGraficasReportes(series, rango) {
  const fecha = new Intl.DateTimeFormat("es-SV", { weekday: "short", day: "numeric", month: "short" });
  const estilos = getComputedStyle(document.body);
  const aviso = document.getElementById("aviso-graficas");
  aviso.hidden = typeof Chart !== "undefined";
  aviso.textContent = aviso.hidden ? "" : "No se pudieron cargar las gráficas. Puedes consultar los valores en las tablas; revisa tu conexión y recarga la página.";
  const dias = diasEnRango(rango.inicio, rango.fin);
  document.getElementById("titulo-grafica-ventas").textContent = dias === 7 ? "Ventas semanales" : "Ventas del período";
  document.getElementById("descripcion-ventas").textContent = `Unidades vendidas por día · ${dias} ${dias === 1 ? "día" : "días"} del período seleccionado.`
    + (dias > 7 ? " Desliza horizontalmente para ver todos los días." : "");
  document.getElementById("descripcion-demanda").textContent = "7 días posteriores al período · promedio de ventas por día de la semana con registros.";
  for (const [tipo, datos, variable, unidad, horizontal, tipoGrafica] of [
    ["ventas", series.ventas, "--text", "unidades", false, "line"],
    ["ingresos", series.ingresos, "--success", "USD", true, "bar"],
    ["demanda", series.demanda, "--accent", "unidades estimadas", false, "bar"]
  ]) {
    const etiquetas = datos.map(dato => horizontal ? dato.nombre : fecha.format(dato.fecha));
    const valores = datos.map(dato => dato.valor);
    mostrarTablaReporte(tipo, valores.some(valor => valor !== null)
      ? datos.map((dato, indice) => [etiquetas[indice], valorTablaReporte(dato.valor, unidad)]) : []);
    actualizarGraficaReporte(tipo, etiquetas, valores, estilos.getPropertyValue(variable).trim(), unidad, horizontal, tipoGrafica);
  }
  seriesMermasActuales = series.mermas;
  const cantidad = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 3 });
  mostrarTablaReporte("mermas", series.mermas.map(dato => [dato.nombre,
    [...dato.cantidades].map(([unidad, valor]) => `${cantidad.format(valor)} ${unidad}`).join(" + "),
    dato.kg === null ? "Sin conversión a kg" : valorTablaReporte(dato.kg, "kg"), valorTablaReporte(dato.costo, "USD")]));
  mostrarGraficaMermas();
}

for (const [id, medida] of [["mermas-en-kg", "kg"], ["mermas-en-usd", "USD"]]) {
  document.getElementById(id).addEventListener("click", () => {
    medidaMermasReporte = medida;
    mostrarGraficaMermas();
  });
}
