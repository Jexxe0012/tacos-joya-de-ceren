"use strict";

// Serie de demostración equivalente a la utilizada en Reportes. Cuando los
// módulos compartan datos reales, esta fuente se reemplazará sin cambiar la vista.
(() => {
  const canvas = document.getElementById("grafica-ventas-dashboard");
  if (!canvas || typeof Chart === "undefined") return;

  const estilos = getComputedStyle(document.body);
  const texto = estilos.getPropertyValue("--text").trim();
  const borde = estilos.getPropertyValue("--bs-border-color").trim();
  const ventas = [120, 130, 145, 155, 170, 200, 158];

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["L", "M", "X", "J", "V", "S", "D"],
      datasets: [{
        label: "Tacos vendidos",
        data: ventas,
        backgroundColor: ventas.map((_, indice) => indice === ventas.length - 1 ? texto : "#C9CDD3"),
        borderRadius: 5,
        maxBarThickness: 38
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      locale: "es-SV",
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: contexto => `${contexto.parsed.y} tacos vendidos` } }
      },
      scales: {
        x: { ticks: { color: texto, maxRotation: 0 }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: texto, precision: 0 }, grid: { color: borde }, title: { display: true, text: "Tacos", color: texto } }
      }
    }
  });
})();
