import Chart from "chart.js/auto";
import { valorTablaReporte } from "./series.js";

export function crearGraficaReporte(canvas, especificacion) {
  const { etiquetas, valores, variableColor, unidad, horizontal, tipoGrafica, anchoMinimo } = especificacion;
  const ventasExtendidas = anchoMinimo > 0;
  const estilos = getComputedStyle(document.body);
  const color = estilos.getPropertyValue(variableColor).trim();
  const texto = estilos.getPropertyValue("--text").trim();
  const ejeValores = { beginAtZero: true, title: { display: true, text: unidad, color: texto },
    ticks: { color: texto, precision: horizontal ? 2 : 0 },
    grid: { color: estilos.getPropertyValue("--bs-border-color").trim() } };
  const ejeEtiquetas = { ticks: { color: texto, maxRotation: 0, autoSkip: !horizontal && !ventasExtendidas,
    maxTicksLimit: ventasExtendidas ? etiquetas.length : 7 }, grid: { display: false } };
  return new Chart(canvas, {
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
  });
}

