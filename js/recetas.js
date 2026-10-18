"use strict";

(() => {

  const sesion = Guard.getSesion();
  if (!sesion) return;

  const esAdmin = sesion.rol === "admin";

  const CATALOGO_INSUMOS = CatalogoInsumos.listar();

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
    preparacionMin: 20,
    preparacionMax: 1000,
    ingredientesMax: 15,
    busquedaMax: 60
  };

  // Nombre de receta: letras (con tildes y ñ), números, espacios y signos
  // que se usan en nombres de platos, como "Horchata de 12 onzas".
  const PATRON_NOMBRE = /^[\p{L}\p{N} .,'()&-]+$/u;
  // Búsqueda: lo mismo pero más corto; sin símbolos raros que no están en ningún nombre.
  const PATRON_BUSQUEDA = /^[\p{L}\p{N}\s.,'-]*$/u;

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

  // Deja un texto listo para comparar: minúsculas, sin tildes y con un solo
  // espacio entre palabras. Así "Taco  al PASTÓR " y "taco al pastor" son iguales.
  function normalizar(texto) {
    return String(texto ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
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

  // focus: false apaga la "trampa de foco" de Bootstrap en este modal. Sin esto,
  // cuando SweetAlert2 abre la confirmación de margen negativo encima del
  // formulario, Bootstrap le roba el foco y el teclado deja de funcionar en el
  // diálogo. El foco inicial lo ponemos nosotros en el nombre (más abajo).
  const modalReceta = new bootstrap.Modal($("modal-receta"), { focus: false });
  const modalDetalle = new bootstrap.Modal($("modal-detalle"));
  const botonGuardar = $("btn-guardar-receta");
  const botonAgregarIngrediente = $("btn-agregar-ingrediente");

  let idEnDetalle = null;

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
      UI.error("Receta no encontrada", "Esa receta ya no está en el catálogo.");
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

  // Con 15 ingredientes el botón se desactiva y dice por qué.
  function actualizarBotonAgregar() {
    const lleno = listaIngredientes.children.length >= LIMITES.ingredientesMax;
    botonAgregarIngrediente.disabled = lleno;
    botonAgregarIngrediente.title = lleno ? `Máximo ${LIMITES.ingredientesMax} ingredientes por receta.` : "";
  }

  function agregarFilaIngrediente(linea = null) {
    if (listaIngredientes.children.length >= LIMITES.ingredientesMax) {
      UI.aviso(`Una receta admite hasta ${LIMITES.ingredientesMax} ingredientes.`, "warning");
      return;
    }

    // Una fila nueva arranca con el primer insumo que todavía no está en la
    // receta, para no crear un repetido sin querer.
    const usados = leerIngredientes().map(fila => fila.insumoId);
    const libre = CATALOGO_INSUMOS.find(insumo => !usados.includes(insumo.id)) || CATALOGO_INSUMOS[0];
    const insumoId = linea ? linea.insumoId : libre.id;
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
              value="${linea ? linea.cantidad : ""}" required>
            <span class="input-group-text" data-campo="unidad">${esc(insumo.unidad)}</span>
          </div>
        </label>
      </div>
      <div class="col-5 col-sm-2 d-grid">
        <button class="btn btn-app-secondary" type="button" data-accion="quitar-ingrediente">Quitar</button>
      </div>
    `;
    listaIngredientes.append(fila);
    actualizarBotonAgregar();
    actualizarCalculos();
  }

  function leerIngredientes() {
    return Array.from(listaIngredientes.children).map(fila => ({
      insumoId: fila.querySelector('[data-campo="insumo"]').value,
      cantidad: Number(fila.querySelector('[data-campo="cantidad"]').value),
      fila,
      elementoInsumo: fila.querySelector('[data-campo="insumo"]'),
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

  // ---------- Validación del formulario de receta ----------

  // Regla que cruza datos: el nombre no puede repetirse en el catálogo,
  // sin importar mayúsculas, tildes ni espacios de más. Al editar, la
  // receta no choca consigo misma.
  function nombreRepetido(nombre) {
    const buscado = normalizar(nombre);
    const otra = obtenerRecetas().find(receta =>
      String(receta.id) !== String(campoId.value) && normalizar(receta.nombre) === buscado
    );
    return otra ? `Ya existe la receta «${otra.nombre}».` : "";
  }

  // El precio solo se pide si la categoría se vende (las preparaciones base no).
  function seVendeLaCategoria() {
    return campoCategoria.value !== "" && categoriaSeVende(campoCategoria.value);
  }

  // Comparar precio * 100 con su redondeo falla con decimales:
  // 1.15 * 100 da 114.99999999999999. Por eso se compara con un margen mínimo.
  function tieneMaximoDosDecimales(numero) {
    return Math.abs(Math.round(numero * 100) - numero * 100) < 1e-9;
  }

  function reglaPrecio(valor) {
    if (!seVendeLaCategoria()) return "";
    if (String(valor).trim() === "") return "Escribe el precio de venta.";
    if (Valida.numero(valor, { min: LIMITES.precioMin, max: LIMITES.precioMax })) {
      return `El precio va de ${moneda.format(LIMITES.precioMin)} a ${moneda.format(LIMITES.precioMax)}.`;
    }
    if (!tieneMaximoDosDecimales(Number(valor))) return "Usa como máximo dos decimales.";
    return "";
  }

  // Cantidad de un ingrediente. Los insumos que se cuentan por unidad
  // (tortillas, limones, vasos) solo aceptan números enteros.
  function reglaCantidad(valor, insumo) {
    const limpio = String(valor ?? "").trim();
    const numero = Number(limpio);
    if (limpio === "") return "Escribe la cantidad.";
    if (!Number.isFinite(numero) || numero <= 0) return "La cantidad debe ser mayor que cero.";
    if (numero < LIMITES.cantidadMin) return `La cantidad mínima es ${LIMITES.cantidadMin}.`;
    if (numero > LIMITES.cantidadMax) return `La cantidad máxima es ${LIMITES.cantidadMax}.`;
    if (insumo && insumo.unidad === "unidad" && !Number.isInteger(numero)) {
      return `${insumo.nombre} se cuenta por unidades: usa un número entero.`;
    }
    return "";
  }

  // Filas en las que el usuario ya escribió o eligió algo. Igual que en
  // Valida.enVivo, una fila que nadie ha tocado no se marca en rojo antes de guardar.
  const filasTocadas = new WeakSet();

  // Revisa las filas de ingredientes y marca cada campo con su error.
  // Con soloTocadas = true (mientras se llena el formulario) revisa solo las
  // filas tocadas; al guardar se llama sin argumento y revisa todas.
  // Devuelve true si todo está bien.
  function validarIngredientes(soloTocadas = false) {
    const lineas = leerIngredientes();
    const cajaGrupo = $("error-ingredientes");
    cajaGrupo.textContent = "";
    let valido = true;

    if (lineas.length === 0) {
      if (!soloTocadas) cajaGrupo.textContent = "Agrega al menos un ingrediente.";
      return soloTocadas;
    }

    // Los repetidos se buscan en todas las filas, tocadas o no.
    const vistos = new Set();
    for (const linea of lineas) {
      const repetido = vistos.has(linea.insumoId);
      vistos.add(linea.insumoId);
      if (soloTocadas && !filasTocadas.has(linea.fila)) continue;

      const insumo = buscarInsumo(linea.insumoId);

      // Insumo: que exista, que tenga costo y que no esté repetido.
      let errorInsumo = "";
      if (!insumo) {
        errorInsumo = "Elige un insumo de la lista.";
      } else if (!(insumo.costoUnitario > 0)) {
        errorInsumo = "Este insumo no tiene un costo de referencia mayor que cero.";
      } else if (repetido) {
        errorInsumo = "Insumo repetido. Suma la cantidad en una sola línea.";
      }

      if (errorInsumo) Valida.marcar(linea.elementoInsumo, errorInsumo);
      else Valida.limpiar(linea.elementoInsumo);

      const errorCantidad = reglaCantidad(linea.elementoCantidad.value, insumo);
      if (errorCantidad) Valida.marcar(linea.elementoCantidad, errorCantidad);
      else Valida.limpiar(linea.elementoCantidad);

      if (errorInsumo || errorCantidad) valido = false;
    }

    if (!valido) cajaGrupo.textContent = "Revisa los ingredientes marcados en rojo.";
    return valido;
  }

  function hayErroresEnIngredientes() {
    return $("error-ingredientes").textContent !== "" || listaIngredientes.querySelector(".is-invalid") !== null;
  }

  // Se asigna al final, dentro de "if (esAdmin)", con Valida.enVivo.
  let validarCampos = () => true;

  function llenarCategorias() {
    campoCategoria.innerHTML = '<option value="">Selecciona una categoría</option>' +
      CATEGORIAS.map(cat => `<option value="${cat.id}">${esc(cat.nombre)}</option>`).join("");

    filtroCategoria.innerHTML = '<option value="todas" selected>Todas</option>' +
      CATEGORIAS.map(cat => `<option value="${cat.id}">${esc(cat.nombre)}</option>`).join("");
  }

  function ajustarCampoPrecio() {
    const seVende = seVendeLaCategoria();
    campoPrecio.disabled = !seVende;
    if (!seVende) {
      campoPrecio.value = "";
      Valida.limpiar(campoPrecio); // un campo desactivado no puede quedar en rojo
    }
    $("ayuda-receta-precio").textContent = seVende
      ? "Precio de una porción."
      : "Las preparaciones base no se venden por separado.";
    actualizarCalculos();
  }

  function abrirFormulario(id = null) {
    if (!esAdmin) return;

    // reset() también quita los errores de la vez anterior (lo hace Valida.enVivo).
    formularioReceta.reset();
    $("error-ingredientes").textContent = "";
    listaIngredientes.innerHTML = "";
    campoId.value = "";

    if (id) {
      const receta = DB.getById("recetas", id);
      if (!receta) {
        UI.error("Receta no encontrada", "Esa receta ya no está en el catálogo.");
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
    actualizarBotonAgregar();
    actualizarCalculos();
    modalReceta.show();
  }

  // Arma el objeto que se guarda. Solo se llama cuando todo ya pasó la validación.
  function leerFormulario() {
    const categoria = campoCategoria.value;
    const seVende = seVendeLaCategoria();
    return {
      nombre: campoNombre.value.trim().replace(/\s+/g, " "),
      categoria,
      porciones: Number(campoPorciones.value),
      tiempoMinutos: Number(campoTiempo.value),
      precioVenta: seVende ? Number(campoPrecio.value) : 0,
      estado: campoEstado.value,
      ingredientes: leerIngredientes().map(linea => ({ insumoId: linea.insumoId, cantidad: linea.cantidad })),
      preparacion: campoPreparacion.value.trim()
    };
  }

  async function guardarReceta(evento) {
    evento.preventDefault();
    if (!esAdmin || botonGuardar.disabled) return;

    // Se corren las dos validaciones para marcar todos los errores de una vez.
    const camposBien = validarCampos();
    const ingredientesBien = validarIngredientes();
    if (!camposBien || !ingredientesBien) {
      // validarCampos ya pone el foco en su primer error; si solo fallaron
      // los ingredientes, el foco va al primero de ellos.
      if (camposBien) {
        const primero = listaIngredientes.querySelector(".is-invalid") || botonAgregarIngrediente;
        primero.focus();
      }
      UI.aviso("Revisa los campos marcados en rojo.", "warning");
      return;
    }

    const datos = leerFormulario();
    const reactivar = Valida.bloquearEnvio(botonGuardar);
    try {
      // Regla de negocio: vender por debajo del costo se permite (una
      // promoción, por ejemplo), pero el admin tiene que confirmarlo.
      const margen = margenPorPorcion(datos);
      if (margen !== null && Math.round(margen * 100) < 0) {
        const seguir = await UI.confirmar({
          titulo: "Esta receta deja margen negativo. ¿Guardar de todas formas?",
          texto: `Cada porción cuesta ${moneda.format(costoPorPorcion(datos))} y se vende a ` +
            `${moneda.format(datos.precioVenta)}: se pierden ${moneda.format(-margen)} por porción.`,
          boton: "Sí, guardar",
          peligro: true
        });
        if (!seguir) {
          campoPrecio.focus();
          return;
        }
      }

      const id = campoId.value;
      if (id) {
        DB.update("recetas", id, { ...datos, actualizadaEn: Date.now() });
      } else {
        DB.create("recetas", {
          ...datos,
          creadaPor: sesion.nombre,
          creadaEn: Date.now(),
          actualizadaEn: Date.now()
        });
      }

      modalReceta.hide();
      mostrarListado();
      UI.exito(
        id ? "Cambios guardados" : "Receta agregada",
        id ? `Se actualizó la ficha de ${datos.nombre}.` : `${datos.nombre} ya está en el catálogo.`
      );
    } finally {
      reactivar();
    }
  }

  async function eliminarReceta(id, boton) {
    if (!esAdmin) return;
    const receta = DB.getById("recetas", id);
    if (!receta) {
      UI.error("Receta no encontrada", "Esa receta ya no está en el catálogo.");
      mostrarListado();
      return;
    }

    // Si ya hay ventas de esta receta (módulo Ventas del día), se avisa:
    // las ventas guardan una copia del nombre, así que siguen en los reportes.
    const ventas = DB.getAll("ventas").filter(venta => String(venta.recetaId) === String(id)).length;
    const textoVentas = ventas > 0
      ? `Tiene ${enteros.format(ventas)} ventas registradas; seguirán en los reportes con su nombre. `
      : "";

    const reactivar = Valida.bloquearEnvio(boton);
    try {
      const confirmado = await UI.confirmar({
        titulo: `¿Eliminar «${receta.nombre}»?`,
        texto: `${textoVentas}Los reportes dejarán de tomar en cuenta su consumo estándar. ` +
          "Esta acción no se puede deshacer.",
        boton: "Sí, eliminar",
        peligro: true
      });
      if (!confirmado) return;

      DB.remove("recetas", id);
      mostrarListado(); // la tarjeta (y su botón) desaparecen aquí
      UI.aviso(`Receta eliminada: ${receta.nombre}`);
    } finally {
      reactivar();
    }
  }

  // La búsqueda filtra mientras se escribe. Si el texto no es válido se
  // marca el campo y se deja el listado como estaba.
  filtroTexto.addEventListener("input", () => {
    const error = Valida.texto(filtroTexto.value, {
      max: LIMITES.busquedaMax,
      patron: PATRON_BUSQUEDA,
      mensaje: "Usa solo letras, números y espacios."
    });
    if (error) {
      Valida.marcar(filtroTexto, error);
      return;
    }
    Valida.limpiar(filtroTexto);
    mostrarListado();
  });
  // Al salir del campo se quitan los espacios sobrantes (la búsqueda ya los ignora).
  filtroTexto.addEventListener("change", () => {
    filtroTexto.value = filtroTexto.value.trim().replace(/\s+/g, " ");
  });
  filtroCategoria.addEventListener("change", mostrarListado);
  filtroEstado.addEventListener("change", mostrarListado);
  if (filtroOrden) filtroOrden.addEventListener("change", mostrarListado);

  formularioFiltros.addEventListener("submit", (evento) => evento.preventDefault());
  formularioFiltros.addEventListener("reset", () => {
    // reset() cambia los valores después de este evento; por eso se espera un instante.
    setTimeout(() => {
      Valida.limpiar(filtroTexto);
      mostrarListado();
    }, 0);
  });

  listaRecetas.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-accion]");
    if (!boton) return;
    const id = boton.dataset.id;
    if (boton.dataset.accion === "ver") mostrarDetalle(id);
    if (boton.dataset.accion === "editar") abrirFormulario(id);
    if (boton.dataset.accion === "eliminar") eliminarReceta(id, boton);
  });

  if (esAdmin) {
    $("btn-nueva-receta").addEventListener("click", () => abrirFormulario());
    botonAgregarIngrediente.addEventListener("click", () => agregarFilaIngrediente());
    formularioReceta.addEventListener("submit", guardarReceta);

    // Validación por campo: al salir de cada uno y mientras se corrige.
    validarCampos = Valida.enVivo(formularioReceta, {
      "receta-nombre": v => Valida.texto(v, {
        min: LIMITES.nombreMin,
        max: LIMITES.nombreMax,
        patron: PATRON_NOMBRE,
        mensaje: "Usa letras, números, espacios y los signos . , ' ( ) & -"
      }) || nombreRepetido(v),
      "receta-categoria": v => CATEGORIAS.some(cat => cat.id === v) ? "" : "Selecciona una categoría de la lista.",
      "receta-porciones": v => Valida.numero(v, { min: LIMITES.porcionesMin, max: LIMITES.porcionesMax, entero: true })
        ? `Usa un número entero de ${LIMITES.porcionesMin} a ${LIMITES.porcionesMax}.`
        : "",
      "receta-tiempo": v => Valida.numero(v, { min: LIMITES.tiempoMin, max: LIMITES.tiempoMax, entero: true })
        ? `Usa minutos enteros, de ${LIMITES.tiempoMin} a ${LIMITES.tiempoMax}.`
        : "",
      "receta-precio": reglaPrecio,
      "receta-estado": v => ["activa", "inactiva"].includes(v) ? "" : "Selecciona un estado válido.",
      "receta-preparacion": v => Valida.texto(v, { min: LIMITES.preparacionMin, max: LIMITES.preparacionMax })
    });

    // Como el modal no pone el foco solo (focus: false), lo ponemos en el nombre.
    $("modal-receta").addEventListener("shown.bs.modal", () => campoNombre.focus());

    $("btn-editar-desde-detalle").addEventListener("click", () => {
      modalDetalle.hide();
      abrirFormulario(idEnDetalle);
    });

    listaIngredientes.addEventListener("click", (evento) => {
      const boton = evento.target.closest('[data-accion="quitar-ingrediente"]');
      if (!boton) return;
      boton.closest(".receta-ingrediente").remove();
      actualizarBotonAgregar();
      actualizarCalculos();
      // Al quitar una fila repetida, la otra deja de estar en rojo.
      if (hayErroresEnIngredientes()) validarIngredientes(true);
    });

    listaIngredientes.addEventListener("change", (evento) => {
      if (evento.target.dataset.campo === "insumo") {
        const fila = evento.target.closest(".receta-ingrediente");
        const insumo = buscarInsumo(evento.target.value);
        const entrada = fila.querySelector('[data-campo="cantidad"]');
        fila.querySelector('[data-campo="unidad"]').textContent = insumo ? insumo.unidad : "";
        entrada.step = insumo && insumo.unidad === "unidad" ? "1" : "0.001";
        // Cambiar de insumo puede crear (o quitar) un repetido: se revisa de una vez.
        filasTocadas.add(fila);
        validarIngredientes(true);
      }
      actualizarCalculos();
    });

    // Igual que Valida.enVivo: mientras se escribe solo se revisa si ya había
    // un error (para que el rojo se quite al corregir), y al salir del campo
    // se revisa la fila completa.
    listaIngredientes.addEventListener("input", (evento) => {
      const fila = evento.target.closest(".receta-ingrediente");
      if (fila) filasTocadas.add(fila);
      actualizarCalculos();
      if (hayErroresEnIngredientes()) validarIngredientes(true);
    });
    listaIngredientes.addEventListener("focusout", (evento) => {
      const fila = evento.target.closest(".receta-ingrediente");
      if (fila && filasTocadas.has(fila)) validarIngredientes(true);
    });

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
