"use strict";

// Relación explícita: no cambia los IDs ni busca productos por parecido de nombre.
const InsumosInventario = (() => {
  function unidad(valor) {
    const clave = String(valor || "").trim().toLowerCase();
    const alias = { litro: "l", litros: "l", unidades: "unidad" };
    return Object.hasOwn(alias, clave) ? alias[clave] : clave;
  }

  function equivalenciaAutomatica(origen, destino) {
    const desde = unidad(origen);
    const hasta = unidad(destino);
    if (!desde || !hasta) return null;
    if (desde === hasta) return 1;
    for (const grupo of [{ kg: 1, g: 0.001, lb: 0.45359237 }, { l: 1, ml: 0.001 }, { unidad: 1, docena: 12 }]) {
      if (Object.hasOwn(grupo, desde) && Object.hasOwn(grupo, hasta)) return grupo[desde] / grupo[hasta];
    }
    return null; // Las bolsas, cajas y densidades requieren una equivalencia indicada por el administrador.
  }

  function resolver(insumoId, productos, vinculos) {
    const insumo = CatalogoInsumos.obtener(insumoId);
    const encontrados = vinculos.filter(vinculo => vinculo?.insumoId === insumoId);
    if (!insumo || encontrados.length !== 1) return { error: "sin vínculo único" };
    const vinculo = encontrados[0];
    const producto = productos.get(String(vinculo.productoId));
    if (!producto) return { error: "producto eliminado de Inventario" };
    if (vinculos.some(otro => otro !== vinculo && String(otro?.productoId) === String(producto.id))) {
      return { error: "producto vinculado a más de un ingrediente" };
    }
    if (unidad(vinculo.unidadProducto) !== unidad(producto.unidad)
      || unidad(vinculo.unidadInsumo) !== unidad(insumo.unidad)) return { error: "unidad modificada; revisa el vínculo" };
    const factor = Number(vinculo.factor);
    if (!Number.isFinite(factor) || factor <= 0) return { error: "equivalencia inválida" };
    const automatico = equivalenciaAutomatica(producto.unidad, insumo.unidad);
    if (automatico !== null && Math.abs(factor - automatico) > 1e-9 * Math.max(1, automatico)) {
      return { error: "equivalencia incompatible con las unidades" };
    }
    return { insumo, producto, factor };
  }
  return { unidad, equivalenciaAutomatica, resolver };
})();

(() => {
  const formulario = document.getElementById("formulario-vinculo");
  if (!formulario) return;
  const ingrediente = document.getElementById("vinculo-ingrediente");
  const producto = document.getElementById("vinculo-producto");
  const factor = document.getElementById("vinculo-factor");
  const ayuda = document.getElementById("ayuda-equivalencia");
  const guardar = document.getElementById("btn-guardar-vinculo");
  const quitar = document.getElementById("btn-quitar-vinculo");
  const estado = document.getElementById("estado-vinculos");
  let guardando = false;

  function listaProductos() {
    return new Map(DB.getAll("inventario").filter(item => item?.id != null && typeof item.nombre === "string")
      .map(item => [String(item.id), item]));
  }

  function opciones(select, valores, textoInicial) {
    const seleccion = select.value;
    const elementos = [["", textoInicial], ...valores].map(([id, nombre]) => {
      const opcion = document.createElement("option");
      opcion.value = id;
      opcion.textContent = nombre;
      return opcion;
    });
    select.replaceChildren(...elementos);
    select.value = seleccion;
  }

  function mostrarEquivalencia(cargarGuardada = false) {
    const insumo = CatalogoInsumos.obtener(ingrediente.value);
    const elegido = listaProductos().get(producto.value);
    const guardado = DB.getAll("vinculosInsumos").find(item => item?.insumoId === ingrediente.value);
    quitar.hidden = !guardado;
    if (!insumo || !elegido) {
      factor.value = "";
      factor.disabled = true;
      ayuda.textContent = "Selecciona el ingrediente y su producto para indicar la equivalencia.";
      return;
    }
    factor.disabled = false;
    const automatico = InsumosInventario.equivalenciaAutomatica(elegido.unidad, insumo.unidad);
    factor.readOnly = automatico !== null;
    factor.value = automatico !== null ? String(automatico)
      : cargarGuardada && guardado?.productoId === producto.value ? String(guardado.factor) : "";
    ayuda.textContent = `1 ${elegido.unidad} de ${elegido.nombre} equivale a esta cantidad en ${insumo.unidad} de ${insumo.nombre}. `
      + (automatico !== null ? "La conversión entre estas unidades es automática." : "Indica el contenido real del empaque o la equivalencia medida; no se puede deducir solo por el nombre.");
  }

  function mostrarListado() {
    const productos = listaProductos();
    const vinculos = DB.getAll("vinculosInsumos");
    const tabla = document.getElementById("tabla-vinculos");
    tabla.replaceChildren();
    const filas = CatalogoInsumos.listar().filter(insumo => vinculos.some(vinculo => vinculo?.insumoId === insumo.id));
    for (const insumo of filas) {
      const vinculo = vinculos.find(item => item?.insumoId === insumo.id);
      const resultado = InsumosInventario.resolver(insumo.id, productos, vinculos);
      const fila = document.createElement("tr");
      for (const [indice, texto] of [insumo.nombre, productos.get(String(vinculo.productoId))?.nombre || "Producto eliminado",
        resultado.error ? `Revisar: ${resultado.error}` : `1 ${resultado.producto.unidad} = ${resultado.factor} ${insumo.unidad}`].entries()) {
        const celda = document.createElement(indice ? "td" : "th");
        if (!indice) celda.scope = "row";
        celda.textContent = texto;
        fila.append(celda);
      }
      tabla.append(fila);
    }
    if (!filas.length) {
      const fila = tabla.insertRow();
      const celda = fila.insertCell();
      celda.colSpan = 3;
      celda.textContent = "Todavía no has vinculado ingredientes.";
    }
  }

  function refrescarProductos() {
    opciones(producto, [...listaProductos()].sort((a, b) => a[1].nombre.localeCompare(b[1].nombre, "es"))
      .map(([id, item]) => [id, `${item.nombre} (${item.unidad})`]), "Selecciona un producto");
  }

  const validar = Valida.enVivo(formulario, {
    "vinculo-ingrediente": valor => CatalogoInsumos.obtener(valor) ? "" : "Selecciona un ingrediente de Recetas.",
    "vinculo-producto": valor => {
      if (!listaProductos().has(valor)) return "Selecciona un producto de Inventario.";
      const ocupado = DB.getAll("vinculosInsumos").some(item => item?.insumoId !== ingrediente.value && String(item?.productoId) === valor);
      return ocupado ? "Este producto ya está vinculado a otro ingrediente. Revisa las correspondencias." : "";
    },
    "vinculo-factor": valor => {
      const numero = Number(valor);
      if (!valor || !Number.isFinite(numero) || numero <= 0 || numero > 1000000) return "Indica una equivalencia mayor que cero y de hasta 1,000,000.";
      const elegido = listaProductos().get(producto.value);
      const insumo = CatalogoInsumos.obtener(ingrediente.value);
      if (!elegido || !insumo) return "";
      const automatico = InsumosInventario.equivalenciaAutomatica(elegido.unidad, insumo.unidad);
      return automatico !== null && Math.abs(numero - automatico) > 1e-9 * Math.max(1, automatico)
        ? "La equivalencia debe corresponder a las unidades seleccionadas." : "";
    }
  });

  ingrediente.addEventListener("change", () => {
    refrescarProductos();
    const guardado = DB.getAll("vinculosInsumos").find(item => item?.insumoId === ingrediente.value);
    producto.value = guardado?.productoId || "";
    for (const campo of [producto, factor]) Valida.limpiar(campo);
    mostrarEquivalencia(true);
  });
  producto.addEventListener("focus", refrescarProductos);
  producto.addEventListener("change", () => { Valida.limpiar(factor); mostrarEquivalencia(); });

  formulario.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (guardando || !Guard.requireRole("admin") || !validar()) return;
    guardando = true;
    const desbloquear = Valida.bloquearEnvio(guardar);
    quitar.disabled = true;
    try {
      const insumo = CatalogoInsumos.obtener(ingrediente.value);
      const elegido = listaProductos().get(producto.value);
      const vinculos = DB.getAll("vinculosInsumos").filter(item => item?.insumoId === insumo.id);
      const datos = { insumoId: insumo.id, productoId: String(elegido.id), factor: Number(factor.value),
        unidadInsumo: insumo.unidad, unidadProducto: elegido.unidad,
        actualizadoPor: Guard.getSesion().id, actualizadoEn: new Date().toISOString() };
      if (vinculos.length) {
        DB.update("vinculosInsumos", vinculos[0].id, datos);
        for (const duplicado of vinculos.slice(1)) DB.remove("vinculosInsumos", duplicado.id);
      } else DB.create("vinculosInsumos", datos);
      mostrarListado();
      mostrarEquivalencia(true);
      estado.textContent = "Vínculo guardado. Aplica los filtros para recalcular el reporte y su PDF.";
      await UI.aviso("Vínculo guardado. Aplica los filtros para actualizar el reporte.");
    } catch (error) {
      await UI.error("No se pudo guardar el vínculo", "Revisa el almacenamiento del navegador e intenta de nuevo.");
    } finally { desbloquear(); quitar.disabled = false; guardando = false; }
  });

  quitar.addEventListener("click", async () => {
    if (guardando || !Guard.requireRole("admin")) return;
    const insumoId = ingrediente.value;
    const insumo = CatalogoInsumos.obtener(insumoId);
    if (!insumo) return;
    guardando = true;
    const desbloquear = Valida.bloquearEnvio(quitar);
    guardar.disabled = true;
    try {
      if (!await UI.confirmar({ titulo: "¿Quieres quitar este vínculo?", texto: `Se quitará la correspondencia de ${insumo.nombre}. Las recetas, productos y movimientos se conservarán.`, boton: "Sí, quitar vínculo", peligro: true })) return;
      for (const vinculo of DB.getAll("vinculosInsumos").filter(item => item?.insumoId === insumoId)) DB.remove("vinculosInsumos", vinculo.id);
      producto.value = "";
      mostrarEquivalencia();
      mostrarListado();
      estado.textContent = "Vínculo eliminado. Aplica los filtros para recalcular el reporte y su PDF.";
      await UI.aviso("Vínculo eliminado");
    } catch (error) {
      await UI.error("No se pudo quitar el vínculo", "Intenta de nuevo.");
    } finally { desbloquear(); guardar.disabled = false; guardando = false; }
  });

  opciones(ingrediente, CatalogoInsumos.listar().sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    .map(item => [item.id, `${item.nombre} (${item.unidad})`]), "Selecciona un ingrediente");
  refrescarProductos();
  mostrarEquivalencia();
  mostrarListado();
})();
