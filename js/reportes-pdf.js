"use strict";

// Exporta una copia de los últimos filtros aplicados, sin consultar ni modificar DB.
(() => {
  const boton = document.getElementById("btn-descargar-pdf");
  const estado = document.getElementById("estado-exportacion");
  let exportando = false;
  const color = variable => getComputedStyle(document.body).getPropertyValue(variable).trim();

  function actualizarDisponibilidad() {
    const disponible = typeof window.jspdf?.jsPDF === "function";
    boton.disabled = !disponible;
    estado.hidden = disponible;
    estado.textContent = disponible ? ""
      : "No se pudo cargar la descarga en PDF. Revisa tu conexión y recarga la página.";
    return disponible;
  }

  function imagenGrafica(datos, unidad, tipo, horizontal, limite, variableColor) {
    const canvas = document.createElement("canvas");
    canvas.width = 1100;
    canvas.height = horizontal ? Math.max(320, 80 + datos.length * 55) : 360;
    const ancho = canvas.width;
    const alto = canvas.height;
    const fecha = new Intl.DateTimeFormat("es-SV", { day: "numeric", month: "short" });
    const etiquetas = datos.map(dato => horizontal ? dato.nombre : fecha.format(dato.fecha));
    const valores = datos.map(dato => dato.valor);
    const tinta = color("--text");
    const tono = color(variableColor);
    let grafica;
    try {
      grafica = new Chart(canvas, {
        type: tipo,
        data: { labels: etiquetas, datasets: [{ label: unidad, data: valores,
          borderColor: tono, backgroundColor: tono, borderRadius: 4, borderWidth: 2,
          pointRadius: 4, tension: 0.2, spanGaps: false }] },
        options: { responsive: false, animation: false, devicePixelRatio: 2,
          indexAxis: horizontal ? "y" : "x", locale: "es-SV",
          plugins: { legend: { display: false } },
          scales: {
            [horizontal ? "x" : "y"]: { beginAtZero: true, suggestedMax: limite,
              title: { display: true, text: unidad, color: tinta, font: { size: 18 } },
              ticks: { color: tinta, font: { size: 18 }, precision: unidad === "USD" || unidad === "kg" ? 2 : 0 } },
            [horizontal ? "y" : "x"]: { grid: { display: false },
              ticks: { color: tinta, font: { size: 18 }, autoSkip: false, maxRotation: horizontal ? 0 : 35 } }
          }
        },
        plugins: [{ id: "fondo-pdf", beforeDraw(instancia) {
          const contexto = instancia.ctx;
          contexto.save();
          contexto.globalCompositeOperation = "destination-over";
          contexto.fillStyle = color("--surface");
          contexto.fillRect(0, 0, instancia.width, instancia.height);
          contexto.restore();
        } }]
      });
      return { imagen: canvas.toDataURL("image/png"), ancho, alto };
    } finally {
      if (grafica) grafica.destroy();
    }
  }

  function crearDocumentoPDF(reporte, usuario, generado) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
    const margen = 16;
    const ancho = pdf.internal.pageSize.getWidth();
    const alto = pdf.internal.pageSize.getHeight();
    const contenido = ancho - margen * 2;
    const pie = alto - 18;
    const colores = { tinta: color("--text"), fondo: color("--surface"), azul: color("--color-azul"), crema: color("--color-crema") };
    const fecha = new Intl.DateTimeFormat("es-SV", { day: "2-digit", month: "2-digit", year: "numeric" });
    const periodo = `${fecha.format(reporte.rango.inicio)} - ${fecha.format(reporte.rango.fin)}`;
    let y;

    function encabezado() {
      pdf.setFillColor(colores.azul);
      pdf.rect(0, 0, ancho, 31, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(17);
      pdf.setTextColor(colores.fondo);
      pdf.text("Tacos Joya de Cerén", margen, 14);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text("Reporte de operación", margen, 24);
      pdf.text(periodo, ancho - margen, 24, { align: "right" });
      pdf.setTextColor(colores.tinta);
      y = 41;
    }
    function nuevaPagina() { pdf.addPage(); encabezado(); }
    function espacio(necesario) { if (y + necesario > pie) nuevaPagina(); }
    function texto(valor, negrita = false, tamano = 10) {
      pdf.setFont("helvetica", negrita ? "bold" : "normal");
      pdf.setFontSize(tamano);
      // Las fuentes estándar de PDF admiten el español; se normalizan espacios especiales.
      const lineas = pdf.splitTextToSize(String(valor).replace(/[\u00a0\u202f]/g, " "), contenido);
      for (const linea of lineas) {
        espacio(5);
        pdf.setFont("helvetica", negrita ? "bold" : "normal");
        pdf.setFontSize(tamano);
        pdf.text(linea, margen, y);
        y += 5;
      }
      y += 2;
    }
    function titulo(valor) { espacio(20); y += 3; texto(valor, true, 12); }
    function tabla(nombre, columnas, anchos, filas) {
      espacio(45); // El título y el encabezado acompañan al menos la primera fila.
      titulo(nombre);
      function fila(valores, cabecera) {
        pdf.setFont("helvetica", cabecera ? "bold" : "normal");
        pdf.setFontSize(9);
        const lineas = valores.map((valor, indice) => pdf.splitTextToSize(String(valor).replace(/[\u00a0\u202f]/g, " "), anchos[indice] - 6));
        const altura = Math.max(...lineas.map(grupo => grupo.length)) * 4.5 + 5;
        if (y + altura > pie) {
          nuevaPagina();
          texto(`${nombre} (continuación)`, true, 12);
          if (!cabecera) fila(columnas, true);
        }
        if (cabecera) {
          pdf.setFillColor(colores.crema);
          pdf.rect(margen, y, contenido, altura, "F");
        }
        pdf.setFont("helvetica", cabecera ? "bold" : "normal");
        pdf.setFontSize(9);
        let x = margen;
        lineas.forEach((grupo, indice) => { pdf.text(grupo, x + 3, y + 5); x += anchos[indice]; });
        pdf.setDrawColor(colores.crema);
        pdf.line(margen, y + altura, ancho - margen, y + altura);
        y += altura;
      }
      fila(columnas, true);
      for (const valores of filas) fila(valores, false);
      y += 4;
    }
    function graficas(nombre, datos, unidad, tipo = "bar", horizontal = false, variableColor = "--text") {
      const tituloBase = `${nombre} (${unidad})`;
      if (!datos.some(dato => dato.valor !== null)) {
        titulo(tituloBase); texto("Sin datos en este período."); return;
      }
      if (typeof Chart !== "function") {
        titulo(tituloBase); texto("La gráfica no estuvo disponible. Consulta los indicadores y las tablas del reporte."); return;
      }
      // Se exportan todos los días/productos en partes legibles, sin comprimir un lienzo de 90 días.
      const porParte = horizontal ? 8 : 15;
      const limite = Math.max(...datos.map(dato => dato.valor ?? 0));
      for (let i = 0; i < datos.length; i += porParte) {
        const parte = datos.slice(i, i + porParte);
        const descripcion = horizontal ? `Productos ${i + 1} a ${i + parte.length}`
          : `${fecha.format(parte[0].fecha)} - ${fecha.format(parte[parte.length - 1].fecha)}`;
        if (!parte.some(dato => dato.valor !== null)) {
          titulo(tituloBase); texto(`${descripcion}: sin registros.`); continue;
        }
        const grafica = imagenGrafica(parte, unidad, tipo, horizontal, limite, variableColor);
        const altura = contenido * grafica.alto / grafica.ancho;
        espacio(altura + 28);
        titulo(tituloBase);
        texto(descripcion, false, 9);
        pdf.addImage(grafica.imagen, "PNG", margen, y, contenido, altura, undefined, "FAST");
        y += altura + 6;
      }
    }

    encabezado();
    pdf.setProperties({ title: "Reporte de operación - Tacos Joya de Cerén", author: usuario,
      subject: `Período ${periodo}`, creator: "Tacos Joya de Cerén" });
    texto(`Generado: ${UI.fechaHoy()} ${new Intl.DateTimeFormat("es-SV", { hour: "2-digit", minute: "2-digit", hour12: false }).format(generado)} (hora local)`);
    texto(`Usuario: ${usuario}`);
    texto(`Receta vendida: ${reporte.receta}`);
    texto(`Producto de merma: ${reporte.producto}`);
    texto(reporte.alcance, false, 9);
    const indicador = reporte.indicadores;
    const valor = (numero, unidad) => valorTablaReporte(numero, unidad);
    tabla("Resumen del período", ["Indicador", "Valor"], [108, 70], [
      ["Unidades vendidas", valor(indicador.ventas, "unidades")],
      ["Ingresos registrados", valor(indicador.ingresos, "USD")],
      ["Merma con peso conocido (kg)", valor(indicador.mermaKg, "kg")],
      [`Costo estimado de merma${indicador.sinCosto ? " (parcial)" : ""}`, valor(indicador.costoMerma, "USD")],
      ["Eficiencia de porción", "Sin datos: catálogos sin vincular"]
    ]);
    texto("El costo de merma usa los precios actuales de Inventario. Los litros, cajas y unidades sin un peso conocido no se suman en kg.", false, 9);
    for (const aviso of reporte.avisos) texto(aviso, false, 9);
    titulo("Hallazgo operativo");
    texto(reporte.hallazgo.titulo, true, 10);
    texto(reporte.hallazgo.detalle);
    texto(reporte.hallazgo.sugerencia, false, 9);
    if (reporte.series.ingresos.length) tabla("Ingresos por receta - resumen", ["Receta", "Ingresos"], [128, 50],
      reporte.series.ingresos.slice(0, 10).map(dato => [dato.nombre, valor(dato.valor, "USD")]));
    if (reporte.series.mermas.length) tabla("Mermas por producto - resumen", ["Producto", "Cantidad registrada", "Peso (kg)", "Costo estimado"], [62, 48, 28, 40],
      reporte.series.mermas.slice(0, 10).map(dato => [dato.nombre,
        [...dato.cantidades].map(([unidad, cantidad]) => `${valor(cantidad, "kg")} ${unidad}`).join(" + "),
        dato.kg === null ? "Sin conversión" : valor(dato.kg, "kg"), valor(dato.costo, "USD")]));
    if (reporte.series.ingresos.length > 10 || reporte.series.mermas.length > 10) {
      texto("Las tablas resumen muestran hasta 10 recetas y 10 productos. Las gráficas incluyen todos los registros agrupados.", false, 9);
    }

    if (indicador.ventas !== null || indicador.cantidadMermas) {
      espacio(100);
      titulo("Gráficas del reporte");
      graficas("Ventas por día", reporte.series.ventas, "unidades", "line");
      graficas("Ingresos por receta", reporte.series.ingresos, "USD", "bar", true, "--success");
      graficas("Mermas por producto", reporte.series.mermas.map(dato => ({ nombre: dato.nombre, valor: dato.kg })), "kg", "bar", true, "--danger");
      graficas("Costo de mermas por producto", reporte.series.mermas.map(dato => ({ nombre: dato.nombre, valor: dato.costo })), "USD", "bar", true, "--danger");
      graficas("Demanda prevista", reporte.series.demanda, "unidades estimadas", "bar", false, "--accent");
      texto("Demanda: 7 días posteriores al período, estimados con el promedio por día de la semana que tiene ventas registradas.", false, 9);
    } else {
      titulo("Gráficas"); texto("Sin datos en este período.");
    }
    const paginas = pdf.getNumberOfPages();
    for (let pagina = 1; pagina <= paginas; pagina++) {
      pdf.setPage(pagina);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(colores.tinta);
      pdf.text("Tacos Joya de Cerén - Reporte de operación", margen, alto - 10);
      pdf.text(`Página ${pagina} de ${paginas}`, ancho - margen, alto - 10, { align: "right" });
    }
    return pdf;
  }

  boton.addEventListener("click", async () => {
    if (exportando || !actualizarDisponibilidad() || !reporteActual || !Guard.requireRole("admin")) return;
    exportando = true;
    const desbloquear = Valida.bloquearEnvio(boton);
    boton.textContent = "Generando PDF…";
    const reporte = reporteActual;
    const generado = new Date();
    try {
      await new Promise(resolve => requestAnimationFrame(resolve));
      const pdf = crearDocumentoPDF(reporte, Guard.getSesion().nombre || "Administrador", generado);
      await pdf.save(`reporte-tjc-${UI.fechaHoy()}.pdf`, { returnPromise: true });
      await UI.aviso("Reporte descargado");
    } catch (error) {
      console.error("No se pudo exportar Reportes:", error);
      await UI.error("No se pudo descargar el reporte", "Intenta de nuevo. Si el problema continúa, recarga la página.");
    } finally {
      exportando = false;
      desbloquear();
      boton.textContent = "Descargar reporte PDF";
      actualizarDisponibilidad();
    }
  });
  actualizarDisponibilidad();
})();
