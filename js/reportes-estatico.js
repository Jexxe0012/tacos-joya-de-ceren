"use strict";

// Controlador de la pantalla estática durante la migración a React.
(() => {
  if (!Guard.requireRole("admin")) return;

  const formularioFiltros = document.getElementById("formulario-filtros");
  const filtroPeriodo = document.getElementById("filtro-periodo");
  const filtroInsumo = document.getElementById("filtro-insumo");
  const filtroReceta = document.getElementById("filtro-receta");
  const resumenFiltros = document.getElementById("resumen-filtros");
  const camposRango = document.getElementById("rango-personalizado");
  const filtroFechaInicio = document.getElementById("filtro-fecha-inicio");
  const filtroFechaFin = document.getElementById("filtro-fecha-fin");
  const botonAplicarFiltros = document.getElementById("btn-aplicar-filtros");

  const leerFiltros = () => leerFiltrosReporte(formularioFiltros);
  const validarFiltros = Valida.enVivo(formularioFiltros, reglasFiltrosReporte(leerFiltros));

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

  function cargarOpciones(select, opciones) {
    const seleccion = select.value;
    select.replaceChildren(...opciones.map(([id, nombre]) => new Option(nombre, id)));
    select.value = seleccion;
  }

  function mostrarIndicadores(indicadores, dias) {
    const valores = presentarIndicadoresReporte(indicadores, dias);
    const campos = {
      "valor-ventas": valores.ventas,
      "detalle-ventas": valores.detalleVentas,
      "valor-mermas": valores.mermas,
      "detalle-mermas": valores.detalleMermas,
      "valor-eficiencia": valores.eficiencia,
      "detalle-eficiencia": valores.detalleEficiencia
    };
    for (const [id, texto] of Object.entries(campos)) document.getElementById(id).textContent = texto;
    const tabla = document.getElementById("tabla-eficiencia");
    tabla.replaceChildren();
    for (const fila of valores.filas) {
      const elemento = document.createElement("tr");
      for (const [indice, texto] of [fila.nombre, fila.estandar, fila.real].entries()) {
        const celda = document.createElement(indice ? "td" : "th");
        if (!indice) celda.scope = "row";
        celda.textContent = texto;
        elemento.append(celda);
      }
      tabla.append(elemento);
    }
    document.getElementById("datos-eficiencia").hidden = !valores.filas.length;
    document.getElementById("estado-datos").textContent = indicadores.ejemplos ? "Incluye ventas de ejemplo" : "Registros del sistema";
  }

  function mostrarHallazgoOperativo(hallazgo) {
    document.getElementById("hallazgo-observacion").textContent = hallazgo.titulo;
    document.getElementById("hallazgo-detalle").textContent = hallazgo.detalle;
    document.getElementById("hallazgo-sugerencia").textContent = hallazgo.sugerencia;
  }

  function aplicarFiltros() {
    const reporte = aplicarReporte(leerFiltros());
    mostrarGraficasReportes(reporte.series, reporte.rango);
    mostrarHallazgoOperativo(reporte.hallazgo);
    cargarOpciones(filtroInsumo, opcionesProductosReporte());
    cargarOpciones(filtroReceta, opcionesRecetasReporte());
    mostrarIndicadores(reporte.indicadores, diasEnRango(reporte.rango.inicio, reporte.rango.fin));
    resumenFiltros.textContent = reporte.resumen;
    document.getElementById("alcance-reportes").textContent = `Datos guardados en este navegador. ${reporte.alcance}`;
  }

  formularioFiltros.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (botonAplicarFiltros.disabled || !validarFiltros()) return;
    const desbloquear = Valida.bloquearEnvio(botonAplicarFiltros);
    try {
      aplicarFiltros();
      await UI.aviso("Reporte actualizado");
    } finally {
      desbloquear();
    }
  });

  filtroReceta.addEventListener("focus", () => cargarOpciones(filtroReceta, refrescarRecetasReporte(reporteActual.rango)));
  filtroPeriodo.addEventListener("change", actualizarCamposRango);
  filtroFechaInicio.addEventListener("input", () => revalidarFinReporte(filtroFechaFin, leerFiltros()));
  for (const campo of [filtroFechaInicio, filtroFechaFin]) {
    campo.addEventListener("focus", () => { campo.max = UI.fechaHoy(); });
  }

  const iniciales = filtrosInicialesReporte();
  filtroFechaInicio.value = iniciales.fechaInicio;
  filtroFechaFin.value = iniciales.fechaFin;
  actualizarCamposRango();
  enlazarMedidasMermasReporte();
  aplicarFiltros();
})();
