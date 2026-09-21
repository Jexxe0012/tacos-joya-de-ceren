"use strict";

// El resumen usa los datos de Recetas sin modificar sus registros. Las ventas
// previstas se distribuyen de forma uniforme entre los tacos activos.
(() => {
  const ventasPrevistas = 162;
  const insumosPrincipales = new Map([
    ["res", "Carne de res"],
    ["pastor", "Carne de cerdo (al pastor)"],
    ["pollo", "Pollo"],
    ["queso", "Queso"]
  ]);
  const valor = document.getElementById("valor-consumo-esperado");
  const detalle = document.getElementById("detalle-consumo-esperado");
  const nota = document.getElementById("nota-consumo-insumos");
  const lista = document.getElementById("lista-consumo-insumos");

  if (!valor || !detalle || !nota || !lista || typeof DB === "undefined") return;

  const recetas = DB.getAll("recetas").filter(receta =>
    receta.estado === "activa" && receta.categoria === "taco" && Number(receta.porciones) > 0
  );
  const formato = new Intl.NumberFormat("es-SV", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (recetas.length === 0) {
    valor.textContent = "Sin datos";
    detalle.textContent = "Registra recetas activas para calcularlo.";
    nota.textContent = "No hay recetas de tacos activas en el catálogo.";
    return;
  }

  const cantidades = new Map([...insumosPrincipales.keys()].map(id => [id, 0]));
  const basePorReceta = Math.floor(ventasPrevistas / recetas.length);
  const sobrantes = ventasPrevistas % recetas.length;

  recetas.forEach((receta, indice) => {
    const tacosAsignados = basePorReceta + (indice < sobrantes ? 1 : 0);
    const factor = tacosAsignados / Number(receta.porciones);
    (receta.ingredientes || []).forEach(ingrediente => {
      if (!cantidades.has(ingrediente.insumoId)) return;
      const cantidad = Number(ingrediente.cantidad);
      if (Number.isFinite(cantidad) && cantidad > 0) {
        cantidades.set(ingrediente.insumoId, cantidades.get(ingrediente.insumoId) + cantidad * factor);
      }
    });
  });

  const total = [...cantidades.values()].reduce((suma, cantidad) => suma + cantidad, 0);
  valor.textContent = `${formato.format(total)} kg`;
  detalle.textContent = `Materia prima principal para ${ventasPrevistas} tacos previstos.`;
  nota.textContent = `${ventasPrevistas} tacos distribuidos entre ${recetas.length} receta${recetas.length === 1 ? "" : "s"} activa${recetas.length === 1 ? "" : "s"}.`;
  lista.replaceChildren();

  cantidades.forEach((cantidad, id) => {
    const elemento = document.createElement("li");
    elemento.className = "dashboard-consumo-insumo";
    const nombre = document.createElement("span");
    nombre.textContent = insumosPrincipales.get(id);
    const valorCantidad = document.createElement("strong");
    valorCantidad.textContent = `${formato.format(cantidad)} kg`;
    elemento.append(nombre, valorCantidad);
    lista.append(elemento);
  });
})();

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
