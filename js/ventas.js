"use strict";

(() => {
  const $ = id => document.getElementById(id);
  const formulario = $("formulario-venta");
  const fechaVenta = $("fecha-venta");
  const formatoMoneda = new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" });
  const formatoEntero = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 0 });
  const formatoFecha = new Intl.DateTimeFormat("es-SV", { day: "numeric", month: "short", year: "numeric" });
  const nombresPago = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia" };
  const validadoresLinea = new Map();
  let grafica = null;

  function hoy() { return UI.fechaHoy(); }
  function fechaTexto(fecha) { return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`; }
  function fechaLocal(valor) { return new Date(`${valor}T12:00:00`); }
  function fechaHace(dias) { const fecha = fechaLocal(hoy()); fecha.setDate(fecha.getDate() - dias); return fechaTexto(fecha); }
  function recetasActivas() { return DB.getAll("recetas").filter(receta => receta.estado === "activa" && Number(receta.precioVenta) > 0); }
  function ventasDeFecha(fecha = fechaVenta.value) { return DB.getAll("ventas").filter(venta => venta.fecha === fecha); }

  function sembrarEjemplos() {
    const recetas = recetasActivas();
    if (!recetas.length) return;
    const ejemplos = Array.from({ length: 14 }, (_, indice) => {
      const fecha = fechaHace(indice);
      const receta = recetas[indice % recetas.length];
      const cantidad = 8 + (indice * 7) % 18;
      const precioUnitario = Number(receta.precioVenta);
      const ahora = new Date(`${fecha}T12:00:00`);
      return {
        fecha,
        recetaId: String(receta.id),
        recetaNombre: receta.nombre,
        cantidad,
        precioUnitario,
        total: Math.round(cantidad * precioUnitario * 100) / 100,
        registradoPor: "demo",
        creadoEn: ahora.toISOString(),
        ejemplo: true
      };
    });
    DB.seed("ventas", ejemplos);
  }

  function reglaCantidad(valor) { return Valida.numero(valor, { min: 1, max: 500, entero: true }); }
  const validarCabecera = Valida.enVivo(formulario, {
    "fecha-venta": valor => Valida.fecha(valor, { noFutura: true, maxDiasAtras: 7 }),
    "metodo-pago": valor => ["efectivo", "tarjeta", "transferencia"].includes(valor) ? "" : "Selecciona un método de pago válido."
  });

  function nuevaLinea() {
    const fila = document.createElement("div"); fila.className = "ventas-linea";
    const sufijo = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const recetaId = `receta-${sufijo}`, cantidadId = `cantidad-${sufijo}`, precioId = `precio-${sufijo}`;
    const selector = document.createElement("div");
    const etiquetaReceta = document.createElement("label"); etiquetaReceta.className = "form-label"; etiquetaReceta.htmlFor = recetaId; etiquetaReceta.textContent = "Receta";
    const select = document.createElement("select"); select.className = "form-select producto-receta"; select.id = recetaId; select.required = true;
    const placeholder = document.createElement("option"); placeholder.value = ""; placeholder.textContent = "Selecciona una receta"; select.append(placeholder);
    recetasActivas().forEach(receta => {
      const opcion = document.createElement("option"); opcion.value = String(receta.id); opcion.textContent = receta.nombre; select.append(opcion);
    });
    selector.append(etiquetaReceta, select);

    const cajaCantidad = document.createElement("div");
    const etiquetaCantidad = document.createElement("label"); etiquetaCantidad.className = "form-label"; etiquetaCantidad.htmlFor = cantidadId; etiquetaCantidad.textContent = "Cantidad";
    const cantidad = document.createElement("input"); cantidad.className = "form-control producto-cantidad"; cantidad.id = cantidadId; cantidad.type = "number"; cantidad.min = "1"; cantidad.max = "500"; cantidad.step = "1"; cantidad.required = true; cantidad.value = "1";
    cajaCantidad.append(etiquetaCantidad, cantidad);

    const cajaPrecio = document.createElement("div"); cajaPrecio.className = "ventas-precio";
    const etiquetaPrecio = document.createElement("label"); etiquetaPrecio.className = "form-label"; etiquetaPrecio.htmlFor = precioId; etiquetaPrecio.textContent = "Precio (USD)";
    const precio = document.createElement("input"); precio.className = "form-control producto-precio"; precio.id = precioId; precio.type = "number"; precio.readOnly = true; precio.setAttribute("aria-readonly", "true"); precio.placeholder = "—";
    cajaPrecio.append(etiquetaPrecio, precio);

    const borrar = document.createElement("button"); borrar.type = "button"; borrar.className = "btn btn-app-secondary ventas-borrar"; borrar.setAttribute("aria-label", "Quitar producto"); borrar.textContent = "×";
    borrar.addEventListener("click", () => {
      fila.remove(); validadoresLinea.delete(fila);
      if (!$("lineas-productos").children.length) nuevaLinea();
      actualizarTotal();
    });
    select.addEventListener("change", () => {
      const receta = recetasActivas().find(item => String(item.id) === select.value);
      precio.value = receta ? Number(receta.precioVenta).toFixed(2) : "";
      Valida.limpiar(select); actualizarTotal();
    });
    cantidad.addEventListener("input", actualizarTotal);
    fila.append(selector, cajaCantidad, cajaPrecio, borrar);
    $("lineas-productos").append(fila);
    validadoresLinea.set(fila, Valida.enVivo(formulario, {
      [recetaId]: valor => recetasActivas().some(receta => String(receta.id) === valor) ? "" : "Selecciona una receta activa.",
      [cantidadId]: reglaCantidad
    }));
  }

  function leerLineas() {
    return [...document.querySelectorAll(".ventas-linea")].map(fila => {
      const recetaId = fila.querySelector(".producto-receta").value;
      const receta = recetasActivas().find(item => String(item.id) === recetaId);
      return { recetaId, recetaNombre: receta?.nombre || "", cantidad: Number(fila.querySelector(".producto-cantidad").value), precioUnitario: Number(fila.querySelector(".producto-precio").value) };
    });
  }

  function actualizarTotal() {
    const total = leerLineas().reduce((suma, linea) => suma + linea.cantidad * linea.precioUnitario, 0);
    $("total-pedido").textContent = formatoMoneda.format(Number.isFinite(total) ? total : 0);
  }

  function agruparPedidos(ventas) {
    const pedidos = new Map();
    ventas.forEach((venta, indice) => {
      const id = venta.pedidoId || venta.id || `pedido-${indice}`;
      if (!pedidos.has(id)) pedidos.set(id, { hora: venta.hora || "—", metodoPago: venta.metodoPago, total: 0, productos: [] });
      const pedido = pedidos.get(id);
      pedido.total += Number(venta.total || 0);
      pedido.productos.push(`${Number(venta.cantidad || 0)} × ${venta.recetaNombre || "Receta"}${venta.ejemplo ? " (ejemplo)" : ""}`);
    });
    return [...pedidos.values()];
  }

  function mostrarResumen(ventas, pedidos) {
    const total = ventas.reduce((suma, venta) => suma + Number(venta.total || 0), 0);
    const unidades = ventas.reduce((suma, venta) => suma + Number(venta.cantidad || 0), 0);
    const cantidades = new Map();
    ventas.forEach(venta => cantidades.set(venta.recetaNombre, (cantidades.get(venta.recetaNombre) || 0) + Number(venta.cantidad || 0)));
    const masVendida = [...cantidades].sort((a, b) => b[1] - a[1])[0];
    $("total-dia").textContent = formatoMoneda.format(total);
    $("detalle-ingresos").textContent = `Ingresos del ${formatoFecha.format(fechaLocal(fechaVenta.value))}`;
    $("cantidad-pedidos").textContent = formatoEntero.format(pedidos.length);
    $("cantidad-tacos").textContent = formatoEntero.format(unidades);
    $("receta-mas-vendida").textContent = masVendida ? masVendida[0] : "—";
    $("detalle-receta-mas-vendida").textContent = masVendida ? `${formatoEntero.format(masVendida[1])} unidades` : "Sin ventas en esta fecha";
  }

  function renderizar() {
    const ventas = ventasDeFecha();
    const pedidos = agruparPedidos(ventas);
    mostrarResumen(ventas, pedidos);
    $("titulo-historial").textContent = `Ventas del ${formatoFecha.format(fechaLocal(fechaVenta.value))}`;
    $("sin-ventas").hidden = pedidos.length > 0;
    const cuerpo = $("tabla-ventas"); cuerpo.replaceChildren();
    [...pedidos].reverse().forEach(pedido => {
      const fila = document.createElement("tr");
      const hora = document.createElement("td"); hora.textContent = pedido.hora;
      const productos = document.createElement("td"); productos.textContent = pedido.productos.join(", ");
      const pago = document.createElement("td"); pago.textContent = nombresPago[pedido.metodoPago] || pedido.metodoPago || "—";
      const importe = document.createElement("td"); importe.className = "text-end fw-semibold"; importe.textContent = formatoMoneda.format(pedido.total);
      fila.append(hora, productos, pago, importe); cuerpo.append(fila);
    });
    renderizarGrafica(ventas);
  }

  function renderizarGrafica(ventas) {
    if (typeof Chart === "undefined") return;
    const cantidades = new Map();
    ventas.forEach(venta => cantidades.set(venta.recetaNombre, (cantidades.get(venta.recetaNombre) || 0) + Number(venta.cantidad || 0)));
    const etiquetas = [...cantidades.keys()];
    if (grafica) grafica.destroy();
    grafica = new Chart($("grafica-ventas"), {
      type: "bar",
      data: { labels: etiquetas.length ? etiquetas : ["Sin ventas"], datasets: [{ label: "Unidades vendidas", data: etiquetas.length ? etiquetas.map(nombre => cantidades.get(nombre)) : [0], backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--color-rojo").trim(), borderRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    });
  }

  const esAdmin = Guard.getSesion()?.rol === "admin";
  const hayRecetas = recetasActivas().length > 0;
  sembrarEjemplos();
  fechaVenta.min = fechaHace(7); fechaVenta.max = hoy(); fechaVenta.value = hoy();
  $("limpiar-ventas").hidden = !esAdmin;
  nuevaLinea();
  if (!hayRecetas) {
    $("sin-recetas").hidden = false;
    formulario.querySelectorAll("input, select, button").forEach(control => { control.disabled = true; });
  }
  fechaVenta.addEventListener("change", renderizar);
  $("agregar-producto").addEventListener("click", nuevaLinea);
  formulario.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (!validarCabecera() || ![...validadoresLinea.values()].every(validar => validar())) return;
    const lineas = leerLineas();
    const total = Math.round(lineas.reduce((suma, linea) => suma + linea.cantidad * linea.precioUnitario, 0) * 100) / 100;
    if (!Number.isFinite(total) || total <= 0 || total > 1000000) {
      await UI.error("Total fuera de rango", "El pedido debe tener un total mayor que cero y menor o igual a $1,000,000."); return;
    }
    const desbloquear = Valida.bloquearEnvio(formulario.querySelector('[type="submit"]'));
    try {
      const confirmado = await UI.confirmar({ titulo: "¿Guardar esta venta?", texto: `Total: ${formatoMoneda.format(total)}`, boton: "Guardar venta" });
      if (!confirmado) return;
      const ahora = new Date();
      const pedidoId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const sesion = Guard.getSesion();
      lineas.forEach(linea => DB.create("ventas", {
        fecha: fechaVenta.value,
        recetaId: linea.recetaId,
        recetaNombre: linea.recetaNombre,
        cantidad: linea.cantidad,
        precioUnitario: linea.precioUnitario,
        total: Math.round(linea.cantidad * linea.precioUnitario * 100) / 100,
        registradoPor: sesion?.id,
        creadoEn: ahora.toISOString(),
        ejemplo: false,
        pedidoId,
        hora: `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`,
        metodoPago: $("metodo-pago").value
      }));
      formulario.reset(); validadoresLinea.clear(); $("lineas-productos").replaceChildren(); nuevaLinea(); actualizarTotal(); renderizar();
      await UI.exito("Venta guardada", "El pedido ya aparece en el registro del día.");
    } finally { desbloquear(); }
  });
  $("limpiar-ventas").addEventListener("click", async () => {
    if (Guard.getSesion()?.rol !== "admin") { await UI.error("Acceso no permitido", "Solo el administrador puede eliminar ventas."); return; }
    const ventas = ventasDeFecha();
    if (!ventas.length) { await UI.aviso("No hay registros para esta fecha.", "info"); return; }
    const confirmado = await UI.confirmar({ titulo: "¿Eliminar las ventas de este día?", texto: `Se eliminarán ${ventas.length} líneas de venta. Esta acción no se puede deshacer.`, boton: "Eliminar ventas", peligro: true });
    if (!confirmado) return;
    ventas.forEach(venta => DB.remove("ventas", venta.id)); renderizar();
    await UI.exito("Ventas eliminadas", "El registro de esta fecha quedó vacío.");
  });
  renderizar();
})();
