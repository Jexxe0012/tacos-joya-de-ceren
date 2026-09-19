"use strict";

(() => {

  const sesion = Guard.getSesion();
  if (!sesion) return;

  const esAdmin = sesion.rol === "admin";

  const CATALOGO_INSUMOS = [
    { id: "tortilla", nombre: "Tortilla de maíz", unidad: "unidad", costoUnitario: 0.06, grupoReporte: "otros" },
    { id: "res", nombre: "Carne de res", unidad: "kg", costoUnitario: 8.00, grupoReporte: "res" },
    { id: "pastor", nombre: "Carne al pastor", unidad: "kg", costoUnitario: 7.00, grupoReporte: "pastor" },
    { id: "pollo", nombre: "Pollo deshebrado", unidad: "kg", costoUnitario: 6.00, grupoReporte: "pollo" },
    { id: "chorizo", nombre: "Chorizo", unidad: "kg", costoUnitario: 6.50, grupoReporte: "otros" },
    { id: "queso", nombre: "Queso duro", unidad: "kg", costoUnitario: 11.00, grupoReporte: "queso" },
    { id: "crema", nombre: "Crema", unidad: "litro", costoUnitario: 3.80, grupoReporte: "otros" },
    { id: "frijol", nombre: "Frijol molido", unidad: "kg", costoUnitario: 2.40, grupoReporte: "otros" },
    { id: "cebolla", nombre: "Cebolla", unidad: "kg", costoUnitario: 1.20, grupoReporte: "otros" },
    { id: "cilantro", nombre: "Cilantro", unidad: "kg", costoUnitario: 2.00, grupoReporte: "otros" },
    { id: "tomate", nombre: "Tomate", unidad: "kg", costoUnitario: 1.50, grupoReporte: "otros" },
    { id: "pina", nombre: "Piña", unidad: "kg", costoUnitario: 1.80, grupoReporte: "otros" },
    { id: "aguacate", nombre: "Aguacate", unidad: "unidad", costoUnitario: 0.55, grupoReporte: "otros" },
    { id: "limon", nombre: "Limón", unidad: "unidad", costoUnitario: 0.08, grupoReporte: "otros" },
    { id: "chile", nombre: "Chile seco", unidad: "kg", costoUnitario: 7.50, grupoReporte: "otros" },
    { id: "salsa-roja", nombre: "Salsa roja de la casa", unidad: "litro", costoUnitario: 2.60, grupoReporte: "otros" },
    { id: "aceite", nombre: "Aceite", unidad: "litro", costoUnitario: 2.90, grupoReporte: "otros" },
    { id: "horchata", nombre: "Horchata en polvo", unidad: "kg", costoUnitario: 4.50, grupoReporte: "otros" },
    { id: "azucar", nombre: "Azúcar", unidad: "kg", costoUnitario: 1.10, grupoReporte: "otros" },
    { id: "vaso", nombre: "Vaso desechable", unidad: "unidad", costoUnitario: 0.07, grupoReporte: "otros" }
  ];

  const CATEGORIAS = [
    { id: "taco", nombre: "Taco", seVende: true },
    { id: "bebida", nombre: "Bebida", seVende: true },
    { id: "complemento", nombre: "Complemento", seVende: true },
    { id: "base", nombre: "Preparación base", seVende: false }
  ];

  const LIMITES = {
    nombreMin: 3,
    nombreMax: 60,
    porcionesMin: 1,
    porcionesMax: 200,
    tiempoMin: 1,
    tiempoMax: 240,
    precioMin: 0.05,
    precioMax: 100,
    cantidadMin: 0.001,
    cantidadMax: 1000,
    preparacionMin: 10,
    preparacionMax: 1000,
    ingredientesMax: 15
  };

  const moneda = new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" });
  const enteros = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 0 });
  const decimales = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 3 });
  const formatoFecha = new Intl.DateTimeFormat("es-SV", { day: "2-digit", month: "2-digit", year: "numeric" });

  const $ = (id) => document.getElementById(id);

  function esc(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function buscarInsumo(insumoId) {
    return CATALOGO_INSUMOS.find(insumo => insumo.id === insumoId) || null;
  }

  function nombreCategoria(categoriaId) {
    const categoria = CATEGORIAS.find(cat => cat.id === categoriaId);
    return categoria ? categoria.nombre : "Sin categoría";
  }

  function categoriaSeVende(categoriaId) {
    const categoria = CATEGORIAS.find(cat => cat.id === categoriaId);
    return categoria ? categoria.seVende : true;
  }

  function formatoCantidad(cantidad, unidad) {
    if (unidad === "unidad") {
      return `${decimales.format(cantidad)} ${cantidad === 1 ? "unidad" : "unidades"}`;
    }
    const base = `${decimales.format(cantidad)} ${unidad}`;
    if (unidad === "kg" && cantidad < 1) return `${base} (${enteros.format(cantidad * 1000)} g)`;
    if (unidad === "litro" && cantidad < 1) return `${base} (${enteros.format(cantidad * 1000)} ml)`;
    return base;
  }

  function normalizar(texto) {
    return String(texto ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function costoTotal(receta) {
    return (receta.ingredientes || []).reduce((suma, linea) => {
      const insumo = buscarInsumo(linea.insumoId);
      if (!insumo) return suma;
      return suma + linea.cantidad * insumo.costoUnitario;
    }, 0);
  }

  function costoPorPorcion(receta) {
    const porciones = Number(receta.porciones) || 1;
    return costoTotal(receta) / porciones;
  }

  function margenPorPorcion(receta) {
    if (!categoriaSeVende(receta.categoria)) return null;
    const precio = Number(receta.precioVenta) || 0;
    if (precio <= 0) return null;
    return precio - costoPorPorcion(receta);
  }

  function margenPorcentaje(receta) {
    const margen = margenPorPorcion(receta);
    if (margen === null) return null;
    return margen / Number(receta.precioVenta) * 100;
  }

  function consumoEstandarPorGrupo(receta) {
    const porciones = Number(receta.porciones) || 1;
    const acumulado = {};
    for (const linea of receta.ingredientes || []) {
      const insumo = buscarInsumo(linea.insumoId);
      if (!insumo || insumo.unidad !== "kg") continue;
      acumulado[insumo.grupoReporte] = (acumulado[insumo.grupoReporte] || 0) + linea.cantidad / porciones;
    }
    return acumulado;
  }

  function sembrarRecetas() {
    DB.seed("recetas", [
      {
        nombre: "Taco al pastor",
        categoria: "taco",
        porciones: 10,
        precioVenta: 1.25,
        tiempoMinutos: 20,
        estado: "activa",
        ingredientes: [
          { insumoId: "tortilla", cantidad: 10 },
          { insumoId: "pastor", cantidad: 0.5 },
          { insumoId: "pina", cantidad: 0.15 },
          { insumoId: "cebolla", cantidad: 0.1 },
          { insumoId: "cilantro", cantidad: 0.03 },
          { insumoId: "salsa-roja", cantidad: 0.12 }
        ],
        preparacion: "1. Marinar la carne al pastor desde la noche anterior.\n2. Asar en la plancha hasta que dore por fuera.\n3. Picar la piña y la cebolla en cubos pequeños.\n4. Calentar las tortillas y armar cada taco con carne, piña, cebolla y cilantro.\n5. Servir con salsa roja aparte.",
        creadaPor: "Datos de ejemplo",
        creadaEn: Date.now(),
        actualizadaEn: Date.now()
      },
      {
        nombre: "Taco de res asada",
        categoria: "taco",
        porciones: 10,
        precioVenta: 1.40,
        tiempoMinutos: 18,
        estado: "activa",
        ingredientes: [
          { insumoId: "tortilla", cantidad: 10 },
          { insumoId: "res", cantidad: 0.55 },
          { insumoId: "cebolla", cantidad: 0.1 },
          { insumoId: "cilantro", cantidad: 0.03 },
          { insumoId: "limon", cantidad: 3 },
          { insumoId: "aceite", cantidad: 0.02 }
        ],
        preparacion: "1. Cortar la res en tiras delgadas y salpimentar.\n2. Asar en la plancha con un poco de aceite.\n3. Picar cebolla y cilantro.\n4. Armar los tacos y servir con limón.",
        creadaPor: "Datos de ejemplo",
        creadaEn: Date.now(),
        actualizadaEn: Date.now()
      },
      {
        nombre: "Taco de pollo con queso",
        categoria: "taco",
        porciones: 10,
        precioVenta: 1.20,
        tiempoMinutos: 15,
        estado: "activa",
        ingredientes: [
          { insumoId: "tortilla", cantidad: 10 },
          { insumoId: "pollo", cantidad: 0.5 },
          { insumoId: "queso", cantidad: 0.12 },
          { insumoId: "crema", cantidad: 0.08 },
          { insumoId: "cebolla", cantidad: 0.08 }
        ],
        preparacion: "1. Cocer y deshebrar el pollo.\n2. Sofreír con cebolla hasta que tome color.\n3. Calentar las tortillas y rellenar.\n4. Terminar con queso rallado y un hilo de crema.",
        creadaPor: "Datos de ejemplo",
        creadaEn: Date.now(),
        actualizadaEn: Date.now()
      },
      {
        nombre: "Quesadilla de queso duro",
        categoria: "complemento",
        porciones: 6,
        precioVenta: 1.75,
        tiempoMinutos: 12,
        estado: "activa",
        ingredientes: [
          { insumoId: "tortilla", cantidad: 12 },
          { insumoId: "queso", cantidad: 0.36 },
          { insumoId: "frijol", cantidad: 0.18 },
          { insumoId: "aceite", cantidad: 0.03 }
        ],
        preparacion: "1. Untar frijol en una tortilla.\n2. Agregar queso y tapar con otra tortilla.\n3. Dorar por ambos lados en la plancha.\n4. Cortar por la mitad antes de servir.",
        creadaPor: "Datos de ejemplo",
        creadaEn: Date.now(),
        actualizadaEn: Date.now()
      },
      {
        nombre: "Horchata de 12 onzas",
        categoria: "bebida",
        porciones: 8,
        precioVenta: 1.00,
        tiempoMinutos: 10,
        estado: "activa",
        ingredientes: [
          { insumoId: "horchata", cantidad: 0.2 },
          { insumoId: "azucar", cantidad: 0.18 },
          { insumoId: "vaso", cantidad: 8 }
        ],
        preparacion: "1. Disolver la horchata en agua fría.\n2. Endulzar y probar antes de servir.\n3. Mantener en refrigeración y servir con hielo.",
        creadaPor: "Datos de ejemplo",
        creadaEn: Date.now(),
        actualizadaEn: Date.now()
      },
      {
        nombre: "Salsa roja de la casa",
        categoria: "base",
        porciones: 20,
        precioVenta: 0,
        tiempoMinutos: 25,
        estado: "activa",
        ingredientes: [
          { insumoId: "tomate", cantidad: 1.2 },
          { insumoId: "chile", cantidad: 0.08 },
          { insumoId: "cebolla", cantidad: 0.2 },
          { insumoId: "aceite", cantidad: 0.05 }
        ],
        preparacion: "1. Asar el tomate, el chile y la cebolla.\n2. Licuar con un poco de agua.\n3. Sofreír la mezcla en aceite y dejar reducir.\n4. Guardar en frasco cerrado y rotular con la fecha.",
        creadaPor: "Datos de ejemplo",
        creadaEn: Date.now(),
        actualizadaEn: Date.now()
      }
    ]);
  }

  const listaRecetas = $("lista-recetas");
  const estadoVacio = $("estado-vacio");
  const estadoVacioTitulo = $("estado-vacio-titulo");
  const estadoVacioDetalle = $("estado-vacio-detalle");
  const resumenFiltros = $("resumen-filtros");
  const mensajeGlobal = $("mensaje-global");

  const formularioFiltros = $("formulario-filtros");
  const filtroTexto = $("filtro-texto");
  const filtroCategoria = $("filtro-categoria");
  const filtroEstado = $("filtro-estado");
  const filtroOrden = $("filtro-orden");

  const formularioReceta = $("formulario-receta");
  const campoId = $("receta-id");
  const campoNombre = $("receta-nombre");
  const campoCategoria = $("receta-categoria");
  const campoPorciones = $("receta-porciones");
  const campoTiempo = $("receta-tiempo");
  const campoPrecio = $("receta-precio");
  const campoEstado = $("receta-estado");
  const campoPreparacion = $("receta-preparacion");
  const listaIngredientes = $("ingredientes-lista");

  if (typeof bootstrap === "undefined" || !bootstrap.Modal) {
    mensajeGlobal.className = "alert alert-danger";
    mensajeGlobal.textContent =
      "No se pudo cargar Bootstrap desde internet. Revisa tu conexión y vuelve a cargar la página.";
    return;
  }

  const modalReceta = new bootstrap.Modal($("modal-receta"));
  const modalDetalle = new bootstrap.Modal($("modal-detalle"));
  const modalEliminar = new bootstrap.Modal($("modal-eliminar"));

  let idEnDetalle = null;
  let idAEliminar = null;

  function aplicarRol() {
    if (!esAdmin) {
      document.querySelectorAll("[data-solo-admin]").forEach(elemento => elemento.remove());
      $("recetas-intro").textContent =
        "Consulta los ingredientes, las cantidades y los pasos de cada receta del menú.";
      $("titulo-tercer-indicador").textContent = "Ingredientes distintos";
      $("detalle-costo").textContent = "Insumos que usa el catálogo completo.";
      $("titulo-cuarto-indicador").textContent = "Tiempo promedio";
      $("detalle-margen").textContent = "Minutos de preparación por receta.";
    }

    const barra = $("barra-superior");
    if (barra && !$("btn-logout")) {
      const boton = document.createElement("button");
      boton.id = "btn-logout";
      boton.type = "button";
      boton.className = "btn btn-app-secondary btn-sm";
      boton.textContent = "Cerrar sesión";
      boton.addEventListener("click", () => Guard.logout());
      barra.append(boton);
    }

    const perfil = $("rol-menu");
    if (perfil) perfil.textContent = sesion.nombre;
  }

  let temporizadorMensaje = null;

  function avisar(texto, tipo = "success") {
    mensajeGlobal.textContent = texto;
    mensajeGlobal.className = `alert alert-${tipo === "success" ? "success" : "danger"}`;
    clearTimeout(temporizadorMensaje);
    temporizadorMensaje = setTimeout(() => {
      mensajeGlobal.className = "alert d-none";
      mensajeGlobal.textContent = "";
    }, 4000);
  }

  function marcarError(campo, cajaError, mensaje) {
    campo.classList.toggle("is-invalid", Boolean(mensaje));
    cajaError.textContent = mensaje || "";
    return !mensaje;
  }

  function obtenerRecetas() {
    return DB.getAll("recetas");
  }

  function filtrarRecetas() {
    const texto = normalizar(filtroTexto.value);
    const categoria = filtroCategoria.value;
    const estado = filtroEstado.value;
    const orden = filtroOrden ? filtroOrden.value : "nombre";

    let recetas = obtenerRecetas().filter(receta => {
      if (categoria !== "todas" && receta.categoria !== categoria) return false;
      if (estado !== "todos" && receta.estado !== estado) return false;
      if (!texto) return true;

      if (normalizar(receta.nombre).includes(texto)) return true;
      return (receta.ingredientes || []).some(linea => {
        const insumo = buscarInsumo(linea.insumoId);
        return insumo && normalizar(insumo.nombre).includes(texto);
      });
    });

    recetas = recetas.sort((a, b) => {
      if (orden === "costo") return costoPorPorcion(a) - costoPorPorcion(b);
      if (orden === "margen") return (margenPorPorcion(b) ?? -Infinity) - (margenPorPorcion(a) ?? -Infinity);
      if (orden === "categoria") {
        const comparacion = nombreCategoria(a.categoria).localeCompare(nombreCategoria(b.categoria), "es");
        if (comparacion !== 0) return comparacion;
      }
      return a.nombre.localeCompare(b.nombre, "es");
    });

    return recetas;
  }

  function tarjetaReceta(receta) {
    const costo = costoPorPorcion(receta);
    const margen = margenPorPorcion(receta);
    const porcentaje = margenPorcentaje(receta);
    const activa = receta.estado === "activa";
    const cantidadIngredientes = (receta.ingredientes || []).length;

    const claseMargen = margen === null
      ? ""
      : margen <= 0 ? "receta-margen-bajo" : "receta-margen-ok";

    const datosAdmin = esAdmin ? `
      <div class="receta-dato">
        <dt class="fw-normal">Costo por porción</dt>
        <dd>${moneda.format(costo)}</dd>
      </div>
      <div class="receta-dato">
        <dt class="fw-normal">Precio de venta</dt>
        <dd>${categoriaSeVende(receta.categoria) ? moneda.format(receta.precioVenta || 0) : "No se vende"}</dd>
      </div>
      <div class="receta-dato">
        <dt class="fw-normal">Margen</dt>
        <dd class="${claseMargen}">${margen === null ? "No aplica" : `${moneda.format(margen)} (${enteros.format(porcentaje)}%)`}</dd>
      </div>
    ` : "";

    const botonesAdmin = esAdmin ? `
      <button class="btn btn-app-secondary btn-sm" type="button" data-accion="editar" data-id="${esc(receta.id)}">Editar</button>
      <button class="btn btn-app-primary btn-sm" type="button" data-accion="eliminar" data-id="${esc(receta.id)}">Eliminar</button>
    ` : "";

    return `
      <div class="col-12 col-md-6 col-xl-4">
        <article class="app-panel receta-tarjeta h-100 p-3 p-md-4 d-flex flex-column" data-categoria="${esc(receta.categoria)}">
          <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
            <h3 class="h6 fw-semibold mb-0 receta-nombre">${esc(receta.nombre)}</h3>
            <span class="badge rounded-pill app-estado ${activa ? "app-estado-ok" : "app-estado-atencion"}">
              ${activa ? "Activa" : "Inactiva"}
            </span>
          </div>
          <p class="small text-body-secondary mb-3">
            ${esc(nombreCategoria(receta.categoria))} · rinde ${enteros.format(receta.porciones)} porciones
          </p>
          <dl class="mb-3">
            <div class="receta-dato">
              <dt class="fw-normal">Ingredientes</dt>
              <dd>${enteros.format(cantidadIngredientes)}</dd>
            </div>
            <div class="receta-dato">
              <dt class="fw-normal">Tiempo</dt>
              <dd>${enteros.format(receta.tiempoMinutos)} min</dd>
            </div>
            ${datosAdmin}
          </dl>
          <div class="receta-acciones d-flex flex-wrap gap-2 mt-auto">
            <button class="btn btn-app-secondary btn-sm" type="button" data-accion="ver" data-id="${esc(receta.id)}">Ver ficha</button>
            ${botonesAdmin}
          </div>
        </article>
      </div>
    `;
  }

  function mostrarListado() {
    const recetas = filtrarRecetas();
    const total = obtenerRecetas().length;

    listaRecetas.innerHTML = recetas.map(tarjetaReceta).join("");

    const hayResultados = recetas.length > 0;
    estadoVacio.classList.toggle("d-none", hayResultados);
    if (!hayResultados) {
      if (total === 0) {
        estadoVacioTitulo.textContent = "Todavía no hay recetas registradas";
        estadoVacioDetalle.textContent = esAdmin
          ? "Agrega la primera receta para empezar a calcular costos y consumo estándar."
          : "Cuando el administrador registre las recetas, las verás aquí.";
      } else {
        estadoVacioTitulo.textContent = "Ninguna receta coincide con la búsqueda";
        estadoVacioDetalle.textContent = "Cambia el texto, la categoría o el estado para ver más resultados.";
      }
    }

    resumenFiltros.textContent = total === 0
      ? "El catálogo está vacío."
      : `Mostrando ${enteros.format(recetas.length)} de ${enteros.format(total)} recetas.`;

    mostrarIndicadores();
  }

  function mostrarIndicadores() {
    const recetas = obtenerRecetas();
    const activas = recetas.filter(receta => receta.estado === "activa");

    $("valor-total").textContent = enteros.format(recetas.length);
    $("valor-activas").textContent = enteros.format(activas.length);
    $("detalle-activas").textContent = recetas.length === 0
      ? "Sin recetas en el catálogo."
      : `${enteros.format(recetas.length - activas.length)} fuera del menú.`;

    if (esAdmin) {
      const vendibles = activas.filter(receta => categoriaSeVende(receta.categoria));
      const costoPromedio = vendibles.length
        ? vendibles.reduce((suma, receta) => suma + costoPorPorcion(receta), 0) / vendibles.length
        : null;
      const conMargen = vendibles.filter(receta => margenPorPorcion(receta) !== null);
      const margenPromedio = conMargen.length
        ? conMargen.reduce((suma, receta) => suma + margenPorPorcion(receta), 0) / conMargen.length
        : null;

      $("valor-costo").textContent = costoPromedio === null ? "Sin datos" : moneda.format(costoPromedio);
      $("detalle-costo").textContent = costoPromedio === null
        ? "Registra recetas activas para calcularlo."
        : `Promedio de ${enteros.format(vendibles.length)} recetas activas a la venta.`;

      $("valor-margen").textContent = margenPromedio === null ? "Sin datos" : moneda.format(margenPromedio);
      $("detalle-margen").textContent = margenPromedio === null
        ? "Falta registrar precios de venta."
        : "Diferencia promedio entre precio y costo por porción.";
      return;
    }

    const insumosUsados = new Set();
    recetas.forEach(receta => (receta.ingredientes || []).forEach(linea => insumosUsados.add(linea.insumoId)));
    const tiempoPromedio = recetas.length
      ? recetas.reduce((suma, receta) => suma + (Number(receta.tiempoMinutos) || 0), 0) / recetas.length
      : null;

    $("valor-costo").textContent = enteros.format(insumosUsados.size);
    $("valor-margen").textContent = tiempoPromedio === null ? "Sin datos" : `${enteros.format(tiempoPromedio)} min`;
  }

  function mostrarDetalle(id) {
    const receta = DB.getById("recetas", id);
    if (!receta) {
      avisar("Esa receta ya no está en el catálogo.", "error");
      mostrarListado();
      return;
    }

    idEnDetalle = id;
    $("titulo-modal-detalle").textContent = receta.nombre;

    const filas = (receta.ingredientes || []).map(linea => {
      const insumo = buscarInsumo(linea.insumoId);
      const nombre = insumo ? insumo.nombre : "Insumo no encontrado";
      const unidad = insumo ? insumo.unidad : "";
      const porPorcion = linea.cantidad / (Number(receta.porciones) || 1);
      const costoLinea = insumo ? linea.cantidad * insumo.costoUnitario : 0;
      return `
        <tr>
          <td>${esc(nombre)}</td>
          <td>${esc(formatoCantidad(linea.cantidad, unidad))}</td>
          <td>${esc(formatoCantidad(porPorcion, unidad))}</td>
          ${esAdmin ? `<td>${moneda.format(costoLinea)}</td>` : ""}
        </tr>
      `;
    }).join("");

    const resumenCostos = esAdmin ? `
      <div class="app-panel p-3 mb-3">
        <dl class="mb-0">
          <div class="receta-dato">
            <dt class="fw-normal">Costo total de la receta</dt>
            <dd>${moneda.format(costoTotal(receta))}</dd>
          </div>
          <div class="receta-dato">
            <dt class="fw-normal">Costo por porción</dt>
            <dd>${moneda.format(costoPorPorcion(receta))}</dd>
          </div>
          <div class="receta-dato">
            <dt class="fw-normal">Precio de venta</dt>
            <dd>${categoriaSeVende(receta.categoria) ? moneda.format(receta.precioVenta || 0) : "No se vende"}</dd>
          </div>
          <div class="receta-dato">
            <dt class="fw-normal">Margen por porción</dt>
            <dd>${margenPorPorcion(receta) === null ? "No aplica" : moneda.format(margenPorPorcion(receta))}</dd>
          </div>
        </dl>
      </div>
    ` : "";

    $("contenido-detalle").innerHTML = `
      <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
        <span class="badge rounded-pill app-estado ${receta.estado === "activa" ? "app-estado-ok" : "app-estado-atencion"}">
          ${receta.estado === "activa" ? "Activa" : "Inactiva"}
        </span>
        <span class="small text-body-secondary">
          ${esc(nombreCategoria(receta.categoria))} · rinde ${enteros.format(receta.porciones)} porciones ·
          ${enteros.format(receta.tiempoMinutos)} minutos
        </span>
      </div>

      ${resumenCostos}

      <h3 class="h6 fw-semibold mb-2">Ingredientes</h3>
      <div class="table-responsive mb-4">
        <table class="table table-sm receta-tabla align-middle mb-0">
          <caption class="visually-hidden">Ingredientes de ${esc(receta.nombre)}</caption>
          <thead>
            <tr>
              <th scope="col">Insumo</th>
              <th scope="col">Receta completa</th>
              <th scope="col">Por porción</th>
              ${esAdmin ? '<th scope="col">Costo</th>' : ""}
            </tr>
          </thead>
          <tbody>${filas || `<tr><td colspan="${esAdmin ? 4 : 3}">Esta receta no tiene ingredientes registrados.</td></tr>`}</tbody>
        </table>
      </div>

      <h3 class="h6 fw-semibold mb-2">Preparación</h3>
      <p class="receta-preparacion mb-4">${esc(receta.preparacion)}</p>

      <p class="small text-body-secondary mb-0">
        Registrada por ${esc(receta.creadaPor || "Sin registro")} ·
        última actualización ${esc(formatoFecha.format(new Date(receta.actualizadaEn || receta.creadaEn || Date.now())))}
      </p>
    `;

    modalDetalle.show();
  }

  function opcionesInsumos(seleccionado) {
    return CATALOGO_INSUMOS.map(insumo =>
      `<option value="${esc(insumo.id)}" ${insumo.id === seleccionado ? "selected" : ""}>${esc(insumo.nombre)} (${esc(insumo.unidad)})</option>`
    ).join("");
  }

  function agregarFilaIngrediente(linea = null) {
    if (listaIngredientes.children.length >= LIMITES.ingredientesMax) {
      avisar(`Una receta admite hasta ${LIMITES.ingredientesMax} ingredientes.`, "error");
      return;
    }

    const insumoId = linea ? linea.insumoId : CATALOGO_INSUMOS[0].id;
    const insumo = buscarInsumo(insumoId) || CATALOGO_INSUMOS[0];
    const fila = document.createElement("div");
    fila.className = "row g-2 align-items-end receta-ingrediente";
    fila.innerHTML = `
      <div class="col-12 col-sm-6">
        <label class="form-label small mb-1">Insumo
          <select class="form-select" data-campo="insumo" aria-label="Insumo">${opcionesInsumos(insumoId)}</select>
        </label>
      </div>
      <div class="col-7 col-sm-4">
        <label class="form-label small mb-1 w-100">Cantidad
          <div class="input-group">
            <input class="form-control" type="number" data-campo="cantidad" aria-label="Cantidad"
              min="0" max="${LIMITES.cantidadMax}" step="${insumo.unidad === "unidad" ? "1" : "0.001"}"
              value="${linea ? linea.cantidad : ""}">
            <span class="input-group-text" data-campo="unidad">${esc(insumo.unidad)}</span>
          </div>
        </label>
      </div>
      <div class="col-5 col-sm-2 d-grid">
        <button class="btn btn-app-secondary" type="button" data-accion="quitar-ingrediente">Quitar</button>
      </div>
    `;
    listaIngredientes.append(fila);
    actualizarCalculos();
  }

  function leerIngredientes() {
    return Array.from(listaIngredientes.children).map(fila => ({
      insumoId: fila.querySelector('[data-campo="insumo"]').value,
      cantidad: Number(fila.querySelector('[data-campo="cantidad"]').value),
      elementoCantidad: fila.querySelector('[data-campo="cantidad"]')
    }));
  }

  function actualizarCalculos() {
    const receta = {
      porciones: Number(campoPorciones.value) || 1,
      precioVenta: Number(campoPrecio.value) || 0,
      categoria: campoCategoria.value,
      ingredientes: leerIngredientes().filter(linea => linea.cantidad > 0)
    };

    const total = costoTotal(receta);
    const porPorcion = costoPorPorcion(receta);
    const margen = margenPorPorcion(receta);

    $("calculo-costo-total").textContent = moneda.format(total);
    $("calculo-costo-porcion").textContent = moneda.format(porPorcion);
    $("calculo-margen").textContent = margen === null ? "No aplica" : moneda.format(margen);
    $("calculo-margen").className = margen === null || margen > 0 ? "" : "receta-margen-bajo";
  }

  function limpiarErroresFormulario() {
    formularioReceta.querySelectorAll(".is-invalid").forEach(campo => campo.classList.remove("is-invalid"));
    formularioReceta.querySelectorAll(".receta-error").forEach(caja => { caja.textContent = ""; });
  }

  function llenarCategorias() {
    campoCategoria.innerHTML = '<option value="">Selecciona una categoría</option>' +
      CATEGORIAS.map(cat => `<option value="${cat.id}">${esc(cat.nombre)}</option>`).join("");

    filtroCategoria.innerHTML = '<option value="todas" selected>Todas</option>' +
      CATEGORIAS.map(cat => `<option value="${cat.id}">${esc(cat.nombre)}</option>`).join("");
  }

  function ajustarCampoPrecio() {
    const seVende = categoriaSeVende(campoCategoria.value) && campoCategoria.value !== "";
    campoPrecio.disabled = !seVende;
    if (!seVende) campoPrecio.value = "";
    $("ayuda-receta-precio").textContent = seVende
      ? "Precio de una porción."
      : "Las preparaciones base no se venden por separado.";
    actualizarCalculos();
  }

  function abrirFormulario(id = null) {
    if (!esAdmin) return;

    formularioReceta.reset();
    limpiarErroresFormulario();
    listaIngredientes.innerHTML = "";
    campoId.value = "";

    if (id) {
      const receta = DB.getById("recetas", id);
      if (!receta) {
        avisar("Esa receta ya no está en el catálogo.", "error");
        mostrarListado();
        return;
      }
      $("titulo-modal-receta").textContent = "Editar receta";
      $("btn-guardar-receta").textContent = "Guardar cambios";
      campoId.value = receta.id;
      campoNombre.value = receta.nombre;
      campoCategoria.value = receta.categoria;
      campoPorciones.value = receta.porciones;
      campoTiempo.value = receta.tiempoMinutos;
      campoPrecio.value = receta.precioVenta || "";
      campoEstado.value = receta.estado;
      campoPreparacion.value = receta.preparacion || "";
      (receta.ingredientes || []).forEach(linea => agregarFilaIngrediente(linea));
    } else {
      $("titulo-modal-receta").textContent = "Nueva receta";
      $("btn-guardar-receta").textContent = "Guardar receta";
      campoEstado.value = "activa";
      agregarFilaIngrediente();
    }

    ajustarCampoPrecio();
    $("contador-preparacion").textContent = campoPreparacion.value.length;
    actualizarCalculos();
    modalReceta.show();
  }

  function validarFormulario() {
    let valido = true;

    const nombre = campoNombre.value.trim().replace(/\s+/g, " ");
    let errorNombre = "";
    if (!nombre) {
      errorNombre = "Escribe el nombre de la receta.";
    } else if (nombre.length < LIMITES.nombreMin) {
      errorNombre = `El nombre debe tener al menos ${LIMITES.nombreMin} caracteres.`;
    } else {
      const repetida = obtenerRecetas().some(receta =>
        normalizar(receta.nombre) === normalizar(nombre) && String(receta.id) !== String(campoId.value)
      );
      if (repetida) errorNombre = "Ya existe una receta con ese nombre.";
    }
    valido = marcarError(campoNombre, $("error-receta-nombre"), errorNombre) && valido;

    const categoria = campoCategoria.value;
    const errorCategoria = CATEGORIAS.some(cat => cat.id === categoria)
      ? ""
      : "Selecciona una categoría de la lista.";
    valido = marcarError(campoCategoria, $("error-receta-categoria"), errorCategoria) && valido;

    const porciones = Number(campoPorciones.value);
    let errorPorciones = "";
    if (campoPorciones.value.trim() === "") {
      errorPorciones = "Indica cuántas porciones rinde.";
    } else if (!Number.isInteger(porciones)) {
      errorPorciones = "Usa un número entero de porciones.";
    } else if (porciones < LIMITES.porcionesMin || porciones > LIMITES.porcionesMax) {
      errorPorciones = `Las porciones van de ${LIMITES.porcionesMin} a ${LIMITES.porcionesMax}.`;
    }
    valido = marcarError(campoPorciones, $("error-receta-porciones"), errorPorciones) && valido;

    const tiempo = Number(campoTiempo.value);
    let errorTiempo = "";
    if (campoTiempo.value.trim() === "") {
      errorTiempo = "Indica el tiempo de preparación.";
    } else if (!Number.isInteger(tiempo)) {
      errorTiempo = "Usa minutos enteros.";
    } else if (tiempo < LIMITES.tiempoMin || tiempo > LIMITES.tiempoMax) {
      errorTiempo = `El tiempo va de ${LIMITES.tiempoMin} a ${LIMITES.tiempoMax} minutos.`;
    }
    valido = marcarError(campoTiempo, $("error-receta-tiempo"), errorTiempo) && valido;

    const seVende = categoriaSeVende(categoria) && categoria !== "";
    const precio = Number(campoPrecio.value);
    let errorPrecio = "";
    if (seVende) {
      if (campoPrecio.value.trim() === "") {
        errorPrecio = "Escribe el precio de venta.";
      } else if (Number.isNaN(precio) || precio < LIMITES.precioMin || precio > LIMITES.precioMax) {
        errorPrecio = `El precio va de ${moneda.format(LIMITES.precioMin)} a ${moneda.format(LIMITES.precioMax)}.`;
      } else if (Math.round(precio * 100) !== precio * 100) {
        errorPrecio = "Usa como máximo dos decimales.";
      }
    }
    valido = marcarError(campoPrecio, $("error-receta-precio"), errorPrecio) && valido;

    const estado = campoEstado.value;
    const errorEstado = ["activa", "inactiva"].includes(estado) ? "" : "Selecciona un estado válido.";
    valido = marcarError(campoEstado, $("error-receta-estado"), errorEstado) && valido;

    const lineas = leerIngredientes();
    let errorIngredientes = "";
    lineas.forEach(linea => linea.elementoCantidad.classList.remove("is-invalid"));

    if (lineas.length === 0) {
      errorIngredientes = "Agrega al menos un ingrediente.";
    } else {
      const vistos = new Set();
      for (const linea of lineas) {
        if (vistos.has(linea.insumoId)) {
          errorIngredientes = "Hay un insumo repetido. Súmalo en una sola línea.";
          break;
        }
        vistos.add(linea.insumoId);

        if (!linea.cantidad || linea.cantidad < LIMITES.cantidadMin) {
          linea.elementoCantidad.classList.add("is-invalid");
          errorIngredientes = "Cada ingrediente necesita una cantidad mayor que cero.";
        } else if (linea.cantidad > LIMITES.cantidadMax) {
          linea.elementoCantidad.classList.add("is-invalid");
          errorIngredientes = `La cantidad máxima por ingrediente es ${LIMITES.cantidadMax}.`;
        }
      }
    }
    $("error-ingredientes").textContent = errorIngredientes;
    if (errorIngredientes) valido = false;

    const preparacion = campoPreparacion.value.trim();
    let errorPreparacion = "";
    if (!preparacion) {
      errorPreparacion = "Escribe los pasos de preparación.";
    } else if (preparacion.length < LIMITES.preparacionMin) {
      errorPreparacion = `Describe la preparación con al menos ${LIMITES.preparacionMin} caracteres.`;
    }
    valido = marcarError(campoPreparacion, $("error-receta-preparacion"), errorPreparacion) && valido;

    if (!valido) return null;

    return {
      nombre,
      categoria,
      porciones,
      tiempoMinutos: tiempo,
      precioVenta: seVende ? precio : 0,
      estado,
      ingredientes: lineas.map(linea => ({ insumoId: linea.insumoId, cantidad: linea.cantidad })),
      preparacion
    };
  }

  function guardarReceta(evento) {
    evento.preventDefault();
    if (!esAdmin) return;

    const datos = validarFormulario();
    if (!datos) {
      const primerError = formularioReceta.querySelector(".is-invalid");
      if (primerError) primerError.focus();
      return;
    }

    const id = campoId.value;
    if (id) {
      DB.update("recetas", id, { ...datos, actualizadaEn: Date.now() });
      avisar(`Se guardaron los cambios de ${datos.nombre}.`);
    } else {
      DB.create("recetas", {
        ...datos,
        creadaPor: sesion.nombre,
        creadaEn: Date.now(),
        actualizadaEn: Date.now()
      });
      avisar(`${datos.nombre} se agregó al catálogo.`);
    }

    modalReceta.hide();
    mostrarListado();
  }

  function pedirConfirmacion(id) {
    const receta = DB.getById("recetas", id);
    if (!receta) return;
    idAEliminar = id;
    $("nombre-a-eliminar").textContent = receta.nombre;
    modalEliminar.show();
  }

  function eliminarConfirmado() {
    if (!esAdmin || !idAEliminar) return;
    const receta = DB.getById("recetas", idAEliminar);
    DB.remove("recetas", idAEliminar);
    idAEliminar = null;
    modalEliminar.hide();
    avisar(`${receta ? receta.nombre : "La receta"} se eliminó del catálogo.`);
    mostrarListado();
  }

  filtroTexto.addEventListener("input", () => {
    const permitido = /^[\p{L}\p{N}\s.,'-]*$/u.test(filtroTexto.value);
    marcarError(filtroTexto, $("error-filtro-texto"), permitido ? "" : "Usa solo letras, números y espacios.");
    if (permitido) mostrarListado();
  });
  filtroCategoria.addEventListener("change", mostrarListado);
  filtroEstado.addEventListener("change", mostrarListado);
  if (filtroOrden) filtroOrden.addEventListener("change", mostrarListado);

  formularioFiltros.addEventListener("submit", (evento) => evento.preventDefault());
  formularioFiltros.addEventListener("reset", () => {
    setTimeout(() => {
      marcarError(filtroTexto, $("error-filtro-texto"), "");
      mostrarListado();
    }, 0);
  });

  listaRecetas.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-accion]");
    if (!boton) return;
    const id = boton.dataset.id;
    if (boton.dataset.accion === "ver") mostrarDetalle(id);
    if (boton.dataset.accion === "editar") abrirFormulario(id);
    if (boton.dataset.accion === "eliminar") pedirConfirmacion(id);
  });

  if (esAdmin) {
    $("btn-nueva-receta").addEventListener("click", () => abrirFormulario());
    $("btn-agregar-ingrediente").addEventListener("click", () => agregarFilaIngrediente());
    $("btn-confirmar-eliminar").addEventListener("click", eliminarConfirmado);
    formularioReceta.addEventListener("submit", guardarReceta);

    $("btn-editar-desde-detalle").addEventListener("click", () => {
      modalDetalle.hide();
      abrirFormulario(idEnDetalle);
    });

    listaIngredientes.addEventListener("click", (evento) => {
      const boton = evento.target.closest('[data-accion="quitar-ingrediente"]');
      if (!boton) return;
      boton.closest(".receta-ingrediente").remove();
      actualizarCalculos();
    });

    listaIngredientes.addEventListener("change", (evento) => {
      if (evento.target.dataset.campo === "insumo") {
        const fila = evento.target.closest(".receta-ingrediente");
        const insumo = buscarInsumo(evento.target.value);
        const entrada = fila.querySelector('[data-campo="cantidad"]');
        fila.querySelector('[data-campo="unidad"]').textContent = insumo ? insumo.unidad : "";
        entrada.step = insumo && insumo.unidad === "unidad" ? "1" : "0.001";
      }
      actualizarCalculos();
    });
    listaIngredientes.addEventListener("input", actualizarCalculos);

    campoCategoria.addEventListener("change", ajustarCampoPrecio);
    campoPorciones.addEventListener("input", actualizarCalculos);
    campoPrecio.addEventListener("input", actualizarCalculos);
    campoPreparacion.addEventListener("input", () => {
      $("contador-preparacion").textContent = campoPreparacion.value.length;
    });
  }

  window.Recetas = {
    catalogoInsumos: () => CATALOGO_INSUMOS.map(insumo => ({ ...insumo })),
    categorias: () => CATEGORIAS.map(categoria => ({ ...categoria })),
    listar: obtenerRecetas,
    listarActivas: () => obtenerRecetas().filter(receta => receta.estado === "activa"),
    obtener: (id) => DB.getById("recetas", id),
    costoTotal,
    costoPorPorcion,
    margenPorPorcion,
    consumoEstandarPorGrupo
  };

  sembrarRecetas();
  aplicarRol();
  llenarCategorias();
  mostrarListado();
})();
