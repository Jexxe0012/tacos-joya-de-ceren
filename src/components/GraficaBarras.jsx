import { useId, useLayoutEffect, useRef } from "react";
import Chart from "chart.js/auto";

/** Lienzo y alternativa tabular compartidos por las vistas de operación. */
export default function GraficaBarras({ etiquetas, valores, titulo, unidad = "Unidades", decimales = 0 }) {
  const lienzo = useRef(null);
  const id = useId();
  useLayoutEffect(() => {
    const estilos = getComputedStyle(document.documentElement);
    const grafica = new Chart(lienzo.current, {
      type: "bar",
      data: { labels: etiquetas, datasets: [{ label: unidad, data: valores,
        backgroundColor: estilos.getPropertyValue("--color-rojo").trim(), borderRadius: 5, maxBarThickness: 42 }] },
      options: { responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: decimales } } } }
    });
    return () => grafica.destroy();
  }, [etiquetas, valores, unidad, decimales]);
  return <figure className="mb-0">
    <figcaption className="visually-hidden" id={id}>{titulo}</figcaption>
    <div style={{ height: 230, position: "relative" }}>
      <canvas ref={lienzo} role="img" aria-labelledby={id} />
    </div>
    <details className="small mt-2"><summary>Ver datos de la gráfica</summary>
      <div className="table-responsive"><table className="table table-sm">
        <thead><tr><th>Período o producto</th><th>{unidad}</th></tr></thead>
        <tbody>{etiquetas.map((etiqueta, indice) => <tr key={`${etiqueta}-${indice}`}>
          <th scope="row">{etiqueta}</th><td>{valores[indice].toLocaleString("es-SV", { maximumFractionDigits: decimales })}</td>
        </tr>)}</tbody>
      </table></div>
    </details>
  </figure>;
}
