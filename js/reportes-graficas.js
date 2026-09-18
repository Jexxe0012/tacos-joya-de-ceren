"use strict";

// Fechas locales para agrupar todos los registros del mismo día.
function claveFechaReporte(fecha) {
  return `${fecha.getFullYear()}-${fecha.getMonth() + 1}-${fecha.getDate()}`;
}

function prepararSeriesReportes(registros, rango, insumoSeleccionado) {
  const catalogo = { res: "Res", pastor: "Carne al pastor", pollo: "Pollo", queso: "Queso", otros: "Otros" };
  const ventasPorFecha = new Map();
  const mermaPorInsumo = new Map(Object.keys(catalogo)
    .filter(id => insumoSeleccionado === "todos" || id === insumoSeleccionado)
    .map(id => [id, 0]));
  const finExclusivo = new Date(rango.fin);
  finExclusivo.setDate(finExclusivo.getDate() + 1);

  for (const registro of registros) {
    if (registro.fecha < rango.inicio || registro.fecha >= finExclusivo) continue;
    const clave = claveFechaReporte(registro.fecha);
    ventasPorFecha.set(clave, (ventasPorFecha.get(clave) ?? 0) + registro.tacosVendidos);
    for (const insumo of registro.insumos) {
      if (mermaPorInsumo.has(insumo.id)) {
        mermaPorInsumo.set(insumo.id, mermaPorInsumo.get(insumo.id) + insumo.mermaKg);
      }
    }
  }

  const ventas = [];
  const historialSemana = Array.from({ length: 7 }, () => []);
  for (const fecha = new Date(rango.inicio); fecha < finExclusivo; fecha.setDate(fecha.getDate() + 1)) {
    const valor = ventasPorFecha.get(claveFechaReporte(fecha)) ?? null;
    ventas.push({ fecha: new Date(fecha), valor });
    if (valor !== null) historialSemana[fecha.getDay()].push(valor);
  }

  const demanda = Array.from({ length: 7 }, (_, indice) => {
    const fecha = new Date(rango.fin);
    fecha.setDate(fecha.getDate() + indice + 1);
    const historial = historialSemana[fecha.getDay()];
    return {
      fecha,
      valor: historial.length ? Math.round(historial.reduce((suma, valor) => suma + valor, 0) / historial.length) : null
    };
  });

  const mermas = Array.from(mermaPorInsumo, ([id, valor]) => ({ nombre: catalogo[id], valor }))
    .sort((a, b) => b.valor - a.valor);
  return { ventas, mermas, demanda };
}

const graficasReportes = new Map();

function mostrarTablaReporte(tipo, etiquetas, valores, decimales) {
  const tabla = document.getElementById(`tabla-${tipo}`);
  const formato = new Intl.NumberFormat("es-SV", { maximumFractionDigits: decimales });
  tabla.replaceChildren();
  etiquetas.forEach((etiqueta, indice) => {
    const fila = document.createElement("tr");
    const nombre = document.createElement("th");
    nombre.scope = "row";
    nombre.textContent = etiqueta;
    const valor = document.createElement("td");
    valor.textContent = valores[indice] === null ? "Sin datos" : formato.format(valores[indice]);
    fila.append(nombre, valor);
    tabla.append(fila);
  });
}

function actualizarGraficaReporte(tipo, etiquetas, valores, color, unidad, horizontal = false) {
  const canvas = document.getElementById(`grafica-${tipo}`);
  const ventasExtendidas = tipo === "ventas" && etiquetas.length > 7;
  if (tipo === "ventas") {
    // Se ensancha solo el lienzo interior, no la tarjeta ni la página.
    canvas.parentElement.style.minWidth = ventasExtendidas ? `${etiquetas.length * 80}px` : "0px";
    document.getElementById("desplazamiento-ventas").scrollLeft = 0;
  }
  const disponible = typeof Chart !== "undefined";
  canvas.parentElement.hidden = !disponible;
  if (!disponible) {
    document.getElementById(`datos-${tipo}`).open = true;
    return;
  }
  if (graficasReportes.has(tipo)) {
    const grafica = graficasReportes.get(tipo);
    grafica.data.labels = etiquetas;
    grafica.data.datasets[0].data = valores;
    if (tipo === "ventas") {
      grafica.options.scales.x.ticks.autoSkip = !ventasExtendidas;
      grafica.options.scales.x.ticks.maxTicksLimit = ventasExtendidas ? etiquetas.length : 7;
      grafica.resize();
    }
    grafica.update("none");
    return;
  }

  const estilos = getComputedStyle(document.body);
  const texto = estilos.getPropertyValue("--text").trim();
  const borde = estilos.getPropertyValue("--bs-border-color").trim();
  const ejeValores = { beginAtZero: true, title: { display: true, text: unidad, color: texto },
    ticks: { color: texto, precision: horizontal ? 1 : 0 }, grid: { color: borde } };
  const ejeEtiquetas = { ticks: { color: texto, maxRotation: 0, autoSkip: !horizontal && !ventasExtendidas, maxTicksLimit: ventasExtendidas ? etiquetas.length : 7 }, grid: { display: false } };
  graficasReportes.set(tipo, new Chart(canvas, {
    type: "bar",
    data: {
      labels: etiquetas,
      datasets: [{ label: unidad, data: valores, backgroundColor: color, borderRadius: 5, maxBarThickness: horizontal ? 20 : 38 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      locale: "es-SV",
      indexAxis: horizontal ? "y" : "x",
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: contexto => {
          const valor = horizontal ? contexto.parsed.x : contexto.parsed.y;
          return `${new Intl.NumberFormat("es-SV", { maximumFractionDigits: horizontal ? 2 : 0 }).format(valor)} ${unidad}`;
        } } }
      },
      scales: { x: horizontal ? ejeValores : ejeEtiquetas, y: horizontal ? ejeEtiquetas : ejeValores }
    }
  }));
}

function mostrarGraficasReportes(registros, rango, insumoSeleccionado) {
  const series = prepararSeriesReportes(registros, rango, insumoSeleccionado);
  const fecha = new Intl.DateTimeFormat("es-SV", { weekday: "short", day: "numeric", month: "short" });
  const estilos = getComputedStyle(document.body);
  const disponible = typeof Chart !== "undefined";
  const aviso = document.getElementById("aviso-graficas");
  aviso.hidden = disponible;
  aviso.textContent = disponible ? "" : "No se pudieron cargar las gráficas. Puedes consultar los valores en las tablas; revisa tu conexión y recarga la página.";
  document.getElementById("titulo-grafica-ventas").textContent = series.ventas.length === 7 ? "Ventas semanales" : "Ventas del período";
  document.getElementById("descripcion-ventas").textContent = series.ventas.length <= 7
    ? `Tacos vendidos por día · ${series.ventas.length} días · total del negocio.`
    : "Tacos vendidos por día · últimos 30 días · total del negocio. Desliza horizontalmente para ver todos los días.";
  document.getElementById("descripcion-demanda").textContent = `Próximos 7 días · promedio por día de la semana de los ${series.ventas.length} días seleccionados · total del negocio.`;
  const nombreInsumo = insumoSeleccionado === "todos" ? "todos los ingredientes" : series.mermas[0]?.nombre;
  document.getElementById("descripcion-mermas").textContent = `Kilogramos acumulados en ${series.ventas.length} días · ${nombreInsumo}.`;

  for (const [tipo, datos, variable, unidad, horizontal] of [
    ["ventas", series.ventas, "--text", "tacos", false],
    ["mermas", series.mermas, "--danger", "kg", true],
    ["demanda", series.demanda, "--accent", "tacos estimados", false]
  ]) {
    const etiquetas = datos.map(dato => {
      if (horizontal) return dato.nombre;
      return fecha.format(dato.fecha);
    });
    const valores = datos.map(dato => dato.valor);
    mostrarTablaReporte(tipo, etiquetas, valores, horizontal ? 2 : 0);
    actualizarGraficaReporte(tipo, etiquetas, valores, estilos.getPropertyValue(variable).trim(), unidad, horizontal);
  }
}
