"use strict";

// Calcula el consumo esperado de los ingredientes de las recetas activas.
(() => {
  const ventasPrevistas = 162;

  const valor = document.getElementById("valor-consumo-esperado");
  const detalle = document.getElementById("detalle-consumo-esperado");
  const nota = document.getElementById("nota-consumo-insumos");
  const lista = document.getElementById("lista-consumo-insumos");

  if (
    !valor ||
    !detalle ||
    !nota ||
    !lista ||
    typeof DB === "undefined" ||
    typeof CatalogoInsumos === "undefined"
  ) {
    return;
  }

  const formato = new Intl.NumberFormat("es-SV", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3
  });

  const catalogo = CatalogoInsumos.listar();
  const insumosPorId = new Map(
    catalogo.map(insumo => [insumo.id, insumo])
  );

  const recetas = DB.getAll("recetas").filter(receta =>
    receta.estado === "activa" &&
    receta.categoria === "taco" &&
    Number.isFinite(Number(receta.porciones)) &&
    Number(receta.porciones) > 0
  );

  lista.replaceChildren();

  if (recetas.length === 0) {
    valor.textContent = "Sin datos";
    detalle.textContent = "Registra recetas de tacos activas.";
    nota.textContent = "No hay recetas disponibles para calcular el consumo.";
    return;
  }

  // Distribuye la previsión entre las recetas activas.
  const basePorReceta = Math.floor(ventasPrevistas / recetas.length);
  const sobrantes = ventasPrevistas % recetas.length;

  // Agrupa las cantidades por ingrediente y conserva su unidad.
  const cantidades = new Map();

  recetas.forEach((receta, indice) => {
    const tacosAsignados =
      basePorReceta + (indice < sobrantes ? 1 : 0);

    const porcionesReceta = Number(receta.porciones);
    const factor = tacosAsignados / porcionesReceta;

    (receta.ingredientes || []).forEach(ingrediente => {
      const insumo = insumosPorId.get(ingrediente.insumoId);
      const cantidad = Number(ingrediente.cantidad);

      if (
        !insumo ||
        !Number.isFinite(cantidad) ||
        cantidad <= 0
      ) {
        return;
      }

      if (!cantidades.has(insumo.id)) {
        cantidades.set(insumo.id, {
          nombre: insumo.nombre,
          unidad: insumo.unidad,
          cantidad: 0
        });
      }

      cantidades.get(insumo.id).cantidad += cantidad * factor;
    });
  });

  // El indicador principal muestra únicamente los ingredientes medidos en kg.
  const totalKg = [...cantidades.values()]
    .filter(insumo => insumo.unidad === "kg")
    .reduce((suma, insumo) => suma + insumo.cantidad, 0);

  valor.textContent = `${formato.format(totalKg)} kg`;

  detalle.textContent =
    `Ingredientes medidos en kg para ${ventasPrevistas} tacos previstos.`;

  nota.textContent =
    `Estimación distribuida entre ${recetas.length} recetas activas. Las demás unidades se muestran por separado.`;

  // Muestra todos los ingredientes con su unidad correspondiente.
  cantidades.forEach(insumo => {
    const elemento = document.createElement("li");
    elemento.className = "dashboard-consumo-insumo";

    const nombre = document.createElement("span");
    nombre.textContent = insumo.nombre;

    const cantidad = document.createElement("strong");
    cantidad.textContent =
      `${formato.format(insumo.cantidad)} ${insumo.unidad}`;

    elemento.append(nombre, cantidad);
    lista.append(elemento);
  });

  if (cantidades.size === 0) {
    const mensaje = document.createElement("li");
    mensaje.textContent = "Las recetas no tienen ingredientes válidos registrados.";
    lista.append(mensaje);
  }
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

// Calcula las mermas registradas durante los últimos siete días.
(() => {
  const valor = document.getElementById("valor-merma-semanal");
  const detalle = document.getElementById("detalle-merma-semanal");

  if (!valor || !detalle || typeof DB === "undefined") {
    return;
  }

  const formato = new Intl.NumberFormat("es-SV", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const hoy = new Date();
  const fechaLimite = new Date(hoy);
  fechaLimite.setDate(fechaLimite.getDate() - 6);
  fechaLimite.setHours(0, 0, 0, 0);

  const mermas = DB.getAll("mermas").filter(merma => {
    if (!merma.fecha) {
      return false;
    }

    // Los registros del proyecto pueden guardar la fecha como YYYY-MM-DD.
    const fecha = new Date(`${merma.fecha.slice(0, 10)}T00:00:00`);

    return (
      !Number.isNaN(fecha.getTime()) &&
      fecha >= fechaLimite &&
      fecha <= hoy
    );
  });

  const total = mermas.reduce((suma, merma) => {
    const cantidad = Number(merma.cantidad);

    if (Number.isFinite(cantidad) && cantidad > 0) {
      return suma + cantidad;
    }

    return suma;
  }, 0);

  valor.textContent = `${formato.format(total)} kg`;

  if (mermas.length === 0) {
    detalle.textContent = "No hay mermas registradas en los últimos siete días.";
    return;
  }

  detalle.textContent =
    `${mermas.length} registro${mermas.length === 1 ? "" : "s"} en los últimos siete días.`;
})();

// Identifica el producto que necesita mayor atención en el inventario.
(() => {
  const valor = document.getElementById("valor-cobertura-menor");
  const detalle = document.getElementById("detalle-cobertura-menor");

  if (!valor || !detalle || typeof DB === "undefined") {
    return;
  }

  const formato = new Intl.NumberFormat("es-SV", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const inventario = DB.getAll("inventario").filter(producto => {
    const cantidad = Number(producto.cantidad);
    const minimo = Number(producto.stockMinimo);

    return (
      Number.isFinite(cantidad) &&
      cantidad >= 0 &&
      Number.isFinite(minimo) &&
      minimo >= 0
    );
  });

  if (inventario.length === 0) {
    valor.textContent = "Sin datos";
    detalle.textContent = "No hay productos registrados en el inventario.";
    return;
  }

  // Ordena los productos para colocar primero los agotados,
  // después los que tienen menos existencias respecto al mínimo.
  inventario.sort((a, b) => {
    const cantidadA = Number(a.cantidad);
    const cantidadB = Number(b.cantidad);
    const minimoA = Number(a.stockMinimo);
    const minimoB = Number(b.stockMinimo);

    const agotadoA = cantidadA <= 0;
    const agotadoB = cantidadB <= 0;

    if (agotadoA !== agotadoB) {
      return agotadoA ? -1 : 1;
    }

    const proporcionA = minimoA > 0
      ? cantidadA / minimoA
      : cantidadA === 0 ? 0 : Infinity;

    const proporcionB = minimoB > 0
      ? cantidadB / minimoB
      : cantidadB === 0 ? 0 : Infinity;

    return proporcionA - proporcionB;
  });

  const producto = inventario[0];
  const cantidad = Number(producto.cantidad);
  const minimo = Number(producto.stockMinimo);
  const unidad = producto.unidad || "unidades";

  valor.textContent = producto.nombre || "Producto sin nombre";

  if (cantidad <= 0) {
    detalle.textContent = "Existencias agotadas. Revisa el abastecimiento.";
  } else if (minimo > 0 && cantidad <= minimo) {
    detalle.textContent =
      `Stock crítico: ${formato.format(cantidad)} ${unidad}. Mínimo: ${formato.format(minimo)} ${unidad}.`;
  } else {
    detalle.textContent =
      `Menor nivel de existencias: ${formato.format(cantidad)} ${unidad}.`;
  }
})();

// Genera alertas operativas a partir del inventario y las mermas.
(() => {
  const contador = document.getElementById("contador-alertas");
  const lista = document.getElementById("lista-alertas-dashboard");

  if (!contador || !lista || typeof DB === "undefined") {
    return;
  }

  const inventario = DB.getAll("inventario");
  const mermas = DB.getAll("mermas");

  const alertas = [];

  // 1. Detectar productos agotados o por debajo del mínimo.
  inventario.forEach(producto => {
    const cantidad = Number(producto.cantidad);
    const minimo = Number(producto.stockMinimo);

    if (
      !Number.isFinite(cantidad) ||
      !Number.isFinite(minimo) ||
      cantidad < 0 ||
      minimo < 0
    ) {
      return;
    }

    if (cantidad <= 0) {
      alertas.push({
        tipo: "inventario",
        nombre: producto.nombre || "Producto sin nombre",
        resumen: "Inventario · existencias agotadas",
        significado: "No quedan existencias registradas de este producto.",
        accion: "Revisa el inventario y gestiona su reposición."
      });
    } else if (cantidad <= minimo) {
      alertas.push({
        tipo: "inventario",
        nombre: producto.nombre || "Producto sin nombre",
        resumen: `Inventario · quedan ${cantidad} ${producto.unidad || "unidades"}`,
        significado: `La existencia está en el mínimo permitido o por debajo de él (${minimo} ${producto.unidad || "unidades"}).`,
        accion: "Revisa si es necesario solicitar una reposición."
      });
    }
  });

  // 2. Detectar mermas registradas durante los últimos siete días.
  const hoy = new Date();
  const fechaLimite = new Date(hoy);

  fechaLimite.setDate(fechaLimite.getDate() - 6);
  fechaLimite.setHours(0, 0, 0, 0);

  const mermasSemana = mermas.filter(merma => {
    if (!merma.fecha) {
      return false;
    }

    const fecha = new Date(`${merma.fecha.slice(0, 10)}T00:00:00`);

    return (
      !Number.isNaN(fecha.getTime()) &&
      fecha >= fechaLimite &&
      fecha <= hoy
    );
  });

  // Agrupar las mermas por producto.
  const mermasPorProducto = new Map();

  mermasSemana.forEach(merma => {
    const nombre = merma.producto || "Producto sin nombre";
    const cantidad = Number(merma.cantidad);

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return;
    }

    if (!mermasPorProducto.has(nombre)) {
      mermasPorProducto.set(nombre, {
        cantidad: 0,
        unidad: merma.unidad || "unidades",
        registros: 0
      });
    }

    const grupo = mermasPorProducto.get(nombre);

    grupo.cantidad += cantidad;
    grupo.registros += 1;
  });

  mermasPorProducto.forEach((datos, nombre) => {
    const cantidad = new Intl.NumberFormat("es-SV", {
      maximumFractionDigits: 2
    }).format(datos.cantidad);

    alertas.push({
      tipo: "merma",
      nombre: `Merma: ${nombre}`,
      resumen: `Mermas · ${cantidad} ${datos.unidad} registrados`,
      significado: `Se encontraron ${datos.registros} registro(s) de merma de este producto durante los últimos siete días.`,
      accion: "Revisa los registros y las causas del desperdicio."
    });
  });

  // Mostrar primero las alertas de inventario.
  alertas.sort((a, b) => {
    if (a.tipo === b.tipo) {
      return a.nombre.localeCompare(b.nombre, "es");
    }

    return a.tipo === "inventario" ? -1 : 1;
  });

  contador.textContent =
    `${alertas.length} alerta${alertas.length === 1 ? "" : "s"}`;

  lista.replaceChildren();

  if (alertas.length === 0) {
    const elemento = document.createElement("li");
    elemento.className = "dashboard-alerta";

    const mensaje = document.createElement("p");
    mensaje.className = "small text-body-secondary mb-0";
    mensaje.textContent =
      "No hay alertas de inventario ni mermas recientes.";

    elemento.append(mensaje);
    lista.append(elemento);

    return;
  }

  alertas.forEach((alerta, indice) => {
    const elemento = document.createElement("li");
    elemento.className = "dashboard-alerta";

    const boton = document.createElement("button");
    boton.className = "dashboard-alerta-boton";
    boton.type = "button";
    boton.dataset.bsToggle = "collapse";

    const idDetalle = `detalle-alerta-dinamica-${indice}`;

    boton.dataset.bsTarget = `#${idDetalle}`;
    boton.setAttribute("aria-expanded", "false");
    boton.setAttribute("aria-controls", idDetalle);

    const contenido = document.createElement("span");

    const titulo = document.createElement("strong");
    titulo.textContent = alerta.nombre;

    const resumen = document.createElement("small");
    resumen.textContent = alerta.resumen;

    contenido.append(titulo, resumen);

    const etiqueta = document.createElement("span");
    etiqueta.setAttribute("aria-hidden", "true");
    etiqueta.textContent = "Ver detalle";

    boton.append(contenido, etiqueta);

    const detalle = document.createElement("div");
    detalle.className = "collapse";
    detalle.id = idDetalle;

    const cajaDetalle = document.createElement("div");
    cajaDetalle.className = "dashboard-alerta-detalle";

    const significado = document.createElement("p");
    significado.textContent = alerta.significado;

    const accion = document.createElement("p");
    accion.className = "mb-0";

    const tituloAccion = document.createElement("strong");
    tituloAccion.textContent = "Acción recomendada: ";

    accion.append(tituloAccion, document.createTextNode(alerta.accion));

    cajaDetalle.append(significado, accion);
    detalle.append(cajaDetalle);

    elemento.append(boton, detalle);
    lista.append(elemento);
  });
})();

// Muestra las existencias reales del inventario en Abastecimiento previsto.
(() => {
  const estado = document.getElementById("estado-abastecimiento");
  const lista = document.getElementById("lista-abastecimiento-dashboard");

  if (!estado || !lista || typeof DB === "undefined") {
    return;
  }

  const formato = new Intl.NumberFormat("es-SV", {
    maximumFractionDigits: 2
  });

  const inventario = DB.getAll("inventario")
    .filter(producto => {
      const cantidad = Number(producto.cantidad);

      return (
        producto.nombre &&
        Number.isFinite(cantidad) &&
        cantidad >= 0
      );
    })
    .sort((a, b) => {
      const cantidadA = Number(a.cantidad);
      const cantidadB = Number(b.cantidad);
      const minimoA = Number(a.stockMinimo);
      const minimoB = Number(b.stockMinimo);

      const agotadoA = cantidadA <= 0;
      const agotadoB = cantidadB <= 0;

      if (agotadoA !== agotadoB) {
        return agotadoA ? -1 : 1;
      }

      const criticoA =
        Number.isFinite(minimoA) && minimoA > 0
          ? cantidadA / minimoA
          : Infinity;

      const criticoB =
        Number.isFinite(minimoB) && minimoB > 0
          ? cantidadB / minimoB
          : Infinity;

      return criticoA - criticoB;
    });

  lista.replaceChildren();

  if (inventario.length === 0) {
    estado.textContent = "Sin datos";

    const mensaje = document.createElement("p");
    mensaje.className = "small text-body-secondary mb-0";
    mensaje.textContent = "No hay productos disponibles en el inventario.";

    lista.append(mensaje);
    return;
  }

  const productosVisibles = inventario.slice(0, 5);

  estado.textContent =
    `${inventario.length} producto${inventario.length === 1 ? "" : "s"} registrados`;

  productosVisibles.forEach(producto => {
    const cantidad = Number(producto.cantidad);
    const minimo = Number(producto.stockMinimo);
    const unidad = producto.unidad || "unidades";

    const minimoValido = Number.isFinite(minimo) && minimo >= 0;
    const agotado = cantidad <= 0;
    const bajoMinimo =
      minimoValido && minimo > 0 && cantidad <= minimo;

    let claseBarra = "dashboard-progreso-estable";
    let porcentaje = 100;
    let mensajeEstado = "Existencias disponibles";

    if (agotado) {
      claseBarra = "dashboard-progreso-critico";
      porcentaje = 0;
      mensajeEstado = "Agotado · requiere reposición";
    } else if (bajoMinimo) {
      claseBarra = "dashboard-progreso-critico";
      porcentaje = Math.max(5, Math.min(100, (cantidad / minimo) * 100));
      mensajeEstado = `Stock bajo · mínimo ${formato.format(minimo)} ${unidad}`;
    }

    const elemento = document.createElement("div");
    elemento.className = "dashboard-abastecimiento-item";

    const encabezado = document.createElement("div");
    encabezado.className = "dashboard-abastecimiento-nombre";

    const nombre = document.createElement("strong");
    nombre.textContent = producto.nombre;

    const existencia = document.createElement("span");
    existencia.textContent = `${formato.format(cantidad)} ${unidad}`;

    encabezado.append(nombre, existencia);

    const barra = document.createElement("div");
    barra.className = "progress dashboard-progreso";
    barra.setAttribute("role", "progressbar");
    barra.setAttribute("aria-label", `Existencias de ${producto.nombre}`);
    barra.setAttribute("aria-valuemin", "0");
    barra.setAttribute("aria-valuemax", "100");
    barra.setAttribute("aria-valuenow", String(Math.round(porcentaje)));

    const progreso = document.createElement("div");
    progreso.className = `progress-bar ${claseBarra}`;
    progreso.style.width = `${porcentaje}%`;

    barra.append(progreso);

    const pie = document.createElement("strong");
    pie.className = agotado || bajoMinimo
      ? "dashboard-cobertura dashboard-cobertura-critica"
      : "dashboard-cobertura";

    pie.textContent = mensajeEstado;

    elemento.append(encabezado, barra, pie);
    lista.append(elemento);
  });

  if (inventario.length > productosVisibles.length) {
    const nota = document.createElement("p");
    nota.className = "small text-body-secondary mt-3 mb-0";
    nota.textContent =
      `Se muestran los ${productosVisibles.length} productos que requieren mayor atención. Revisa Inventario para consultar todos.`;

    lista.append(nota);
  }
})();
