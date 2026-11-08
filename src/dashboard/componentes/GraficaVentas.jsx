import { useEffect, useRef, useState } from "react";

function GraficaVentas() {
  const canvasRef = useRef(null);
  const [actualizacion, fijarActualizacion] = useState(0);

  useEffect(() => {
    const actualizar = () => fijarActualizacion(version => version + 1);
    const alVolverVisible = () => {
      if (document.visibilityState === "visible") actualizar();
    };
    const alCambiarStorage = evento => {
      if (evento.key === "ventas") actualizar();
    };

    document.addEventListener("visibilitychange", alVolverVisible);
    window.addEventListener("focus", actualizar);
    window.addEventListener("storage", alCambiarStorage);

    return () => {
      document.removeEventListener("visibilitychange", alVolverVisible);
      window.removeEventListener("focus", actualizar);
      window.removeEventListener("storage", alCambiarStorage);
    };
  }, []);

  useEffect(() => {
  const canvas = canvasRef.current;

  if (!canvas || typeof Chart === "undefined" || typeof DB === "undefined") {
    return;
  }

  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);

  const formatoFecha = fecha =>
    `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;

  const formatoDia = new Intl.DateTimeFormat("es-SV", {
    weekday: "short"
  });

  const registros = DB.getAll("ventas").filter(venta =>
    venta.fecha && venta.ejemplo !== true
  );

  const dias = [];

  for (let i = 6; i >= 0; i--) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() - i);

    dias.push({
      fecha: formatoFecha(fecha),
      etiqueta: formatoDia.format(fecha).replace(".", ""),
      cantidad: 0
    });
  }

  registros.forEach(venta => {
    const dia = dias.find(item => item.fecha === venta.fecha);

    if (!dia) return;

    const cantidad = Number(venta.cantidad);

    if (Number.isFinite(cantidad) && cantidad > 0) {
      dia.cantidad += cantidad;
    }
  });

  const estilos = getComputedStyle(document.body);
  const texto = estilos.getPropertyValue("--text").trim();
  const borde = estilos.getPropertyValue("--bs-border-color").trim();

  const grafica = new Chart(canvas, {
    type: "bar",
    data: {
      labels: dias.map(dia => dia.etiqueta),
      datasets: [{
        label: "Unidades vendidas",
        data: dias.map(dia => dia.cantidad),
        backgroundColor: "#C9CDD3",
        borderRadius: 5,
        maxBarThickness: 38
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          ticks: { color: texto },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: texto,
            precision: 0
          },
          grid: { color: borde }
        }
      }
    }
  });

  return () => {
    grafica.destroy();
  };

}, [actualizacion]);


return (
  <article className="app-panel h-100 p-3 p-md-4">

    <div className="mb-3">
      <h2 className="h5 fw-semibold mb-1">
        Ventas por día
      </h2>

      <p className="small text-body-secondary mb-0">
        Histórico de todos los productos vendidos durante la semana: tacos, bebidas y complementos.
      </p>
    </div>

    <div className="dashboard-grafica">
      <canvas ref={canvasRef}></canvas>
    </div>

  </article>
);

}

export default GraficaVentas;
