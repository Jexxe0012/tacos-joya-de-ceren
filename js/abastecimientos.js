"use strict";

(() => {
  // Respaldo mostrado solo cuando no hay ventas reales en los últimos 7 días.
  const demandaReferencia = [148, 162, 178, 212, 170];
  const diasReferencia = ["Jue", "Vie", "Sáb", "Dom", "Lun"];
  const insumos = [
    { id: "pastor", nombre: "Carne al pastor", unidad: "kg", cantidad: 18.5, porcion: .05, compraHace: 1 },
    { id: "tortillas", nombre: "Tortillas", unidad: "unidades", cantidad: 420, porcion: 1, compraHace: 0 },
    { id: "res", nombre: "Carne de res", unidad: "kg", cantidad: 24, porcion: .055, compraHace: 1 },
    { id: "pollo", nombre: "Pollo", unidad: "kg", cantidad: 38, porcion: .05, compraHace: 1 },
    { id: "queso", nombre: "Queso", unidad: "kg", cantidad: 12, porcion: .012, compraHace: 2 }
  ];
  const formatoNumero = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 1 });
  const formatoFecha = new Intl.DateTimeFormat("es-SV", { day: "numeric", month: "short" });
  const formatoDia = new Intl.DateTimeFormat("es-SV", { weekday: "short", day: "2-digit", month: "2-digit" });
  const $ = id => document.getElementById(id);
  const formulario = $("formulario-pedido");
  const fechaCompra = $("fecha-compra");
  let resultado = null;
  let demanda = null;

  function fechaLocal(valor) { return new Date(`${valor}T12:00:00`); }
  function fechaTexto(fecha) {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
  }
  function sumarDias(fecha, cantidad) { const copia = new Date(fecha); copia.setDate(copia.getDate() + cantidad); return copia; }
  function textoCantidad(cantidad, unidad) { return `${formatoNumero.format(cantidad)} ${unidad}`; }

  function cargarDemanda(fechaHoy = UI.fechaHoy()) {
    const fin = fechaLocal(fechaHoy);
    const fechas = Array.from({ length: 7 }, (_, indice) => fechaTexto(sumarDias(fin, indice - 6)));
    const valores = new Map(fechas.map(fecha => [fecha, 0]));
    let tieneVentas = false;
    DB.getAll("ventas").forEach(venta => {
      if (venta?.ejemplo === true) return;
      const fecha = typeof venta?.fecha === "string" ? venta.fecha.slice(0, 10) : "";
      if (!valores.has(fecha)) return;
      const cantidad = Number(venta.cantidad);
      if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 500) return;
      valores.set(fecha, valores.get(fecha) + cantidad);
      tieneVentas = true;
    });

    if (tieneVentas) {
      return { valores: fechas.map(fecha => valores.get(fecha)), etiquetas: fechas.map(fecha => formatoDia.format(fechaLocal(fecha))), promedio: fechas.reduce((suma, fecha) => suma + valores.get(fecha), 0) / 7, real: true };
    }
    return { valores: demandaReferencia, etiquetas: diasReferencia, promedio: demandaReferencia.reduce((suma, valor) => suma + valor, 0) / demandaReferencia.length, real: false };
  }

  function fechaHace(dias) { return fechaTexto(sumarDias(fechaLocal(UI.fechaHoy()), -dias)); }

  function poblarInsumos() {
    $("insumo-pedido").replaceChildren();
    insumos.forEach(insumo => {
      const opcion = document.createElement("option"); opcion.value = insumo.id; opcion.textContent = insumo.nombre;
      $("insumo-pedido").append(opcion);
    });
  }

  function actualizarCampos() {
    const insumo = insumos.find(item => item.id === $("insumo-pedido").value);
    if (!insumo) return;
    $("cantidad-comprada").value = insumo.cantidad;
    $("porcion-estandar").value = insumo.porcion;
    $("unidad-pedido").textContent = insumo.unidad;
    $("unidad-porcion").textContent = insumo.unidad;
  }

  function reglaPaso(valor, { min, max, paso, nombre }) {
    const error = Valida.numero(valor, { min, max });
    if (error) return error;
    const unidades = Number(valor) / paso;
    return Math.abs(unidades - Math.round(unidades)) < 1e-7 ? "" : `Usa incrementos de ${paso} para ${nombre}.`;
  }

  const validarFormulario = Valida.enVivo(formulario, {
    "insumo-pedido": valor => insumos.some(insumo => insumo.id === valor) ? "" : "Selecciona un insumo válido.",
    "fecha-compra": valor => Valida.fecha(valor, { noFutura: true, maxDiasAtras: 30 }),
    "cantidad-comprada": valor => reglaPaso(valor, { min: .1, max: 5000, paso: .1, nombre: "la cantidad" }),
    "porcion-estandar": valor => reglaPaso(valor, { min: .001, max: 10, paso: .001, nombre: "la porción" })
  });

  function mostrarResultado() {
    const { insumo, consumo, cobertura, agotamiento, fechaPedido } = resultado;
    const critico = cobertura < 3;
    $("resultado-insumo").textContent = insumo.nombre.toLowerCase();
    $("dias-cobertura").textContent = formatoNumero.format(cobertura);
    $("consumo-diario").textContent = textoCantidad(consumo, insumo.unidad);
    $("fecha-agotamiento").textContent = formatoFecha.format(agotamiento);
    const estado = $("estado-cobertura");
    estado.textContent = critico ? "Alerta de recompra" : "Cobertura estable";
    estado.className = `badge rounded-pill app-estado ${critico ? "app-estado-atencion" : "app-estado-ok"}`;
    const alerta = $("alerta-recompra");
    alerta.innerHTML = `<strong>${critico ? `Volver a pedir el ${formatoFecha.format(fechaPedido)}.` : "Inventario con cobertura suficiente."}</strong><span>${critico ? "Conserva 1 día de inventario de seguridad." : `Programa el siguiente pedido antes del ${formatoFecha.format(fechaPedido)}.`}</span>`;
  }

  function calcularProyeccion(insumo, fecha, cantidad, porcion) {
    const consumo = demanda.promedio * porcion;
    const cobertura = cantidad / consumo;
    const agotamiento = sumarDias(fecha, Math.ceil(cobertura));
    return { insumo, fecha, cantidad, porcion, consumo, cobertura, agotamiento, fechaPedido: sumarDias(agotamiento, -1) };
  }

  function proyeccionInsumo(insumo) {
    if (resultado && resultado.insumo.id === insumo.id) return resultado;
    const fecha = sumarDias(fechaLocal(UI.fechaHoy()), -insumo.compraHace);
    return calcularProyeccion(insumo, fecha, insumo.cantidad, insumo.porcion);
  }

  function renderizarTabla() {
    $("tabla-cobertura").replaceChildren();
    insumos.forEach(insumo => {
      const proyeccion = proyeccionInsumo(insumo);
      const urgente = proyeccion.cobertura < 3;
      const fila = document.createElement("tr");
      fila.innerHTML = `<td>${insumo.nombre}</td><td class="fecha-compra"></td><td class="${urgente ? "cobertura-critica" : ""}">${formatoNumero.format(proyeccion.cobertura)} días</td><td><span class="pedido-sugerido ${urgente ? "urgente" : ""}">Pedir ${formatoFecha.format(proyeccion.fechaPedido)}</span></td>`;
      fila.querySelector(".fecha-compra").textContent = formatoFecha.format(proyeccion.fecha);
      $("tabla-cobertura").append(fila);
    });
  }

  function renderizarGrafica() {
    const maximo = Math.max(...demanda.valores, 1);
    $("grafica-demanda").innerHTML = demanda.valores.map((valor, indice) => `<div class="demanda-barra ${valor === maximo ? "destacada" : ""}"><span class="demanda-valor">${valor}</span><span class="demanda-columna" style="height:${(valor / maximo) * 100}%"></span><span class="demanda-dia">${demanda.etiquetas[indice]}</span></div>`).join("");
    $("mensaje-demanda").textContent = demanda.real
      ? `Promedio real: ${formatoNumero.format(demanda.promedio)} tacos por día · últimos 7 días, sin incluir registros de ejemplo.`
      : "Sin ventas reales en los últimos 7 días. Se muestra la serie de referencia del módulo.";
  }

  async function calcularPedido({ avisarCritico = false } = {}) {
    if (!validarFormulario()) return false;
    demanda = cargarDemanda();
    const insumo = insumos.find(item => item.id === $("insumo-pedido").value);
    const fecha = fechaLocal(fechaCompra.value);
    const cantidad = Number($("cantidad-comprada").value);
    const porcion = Number($("porcion-estandar").value);
    resultado = calcularProyeccion(insumo, fecha, cantidad, porcion);
    mostrarResultado();
    renderizarTabla();
    $("mensaje-pedido").textContent = `Cobertura calculada con ${demanda.real ? "ventas reales" : "la serie de referencia"} y la porción estándar.`;
    if (avisarCritico && resultado.cobertura < 3) {
      await UI.error("Cobertura crítica", `${insumo.nombre}: quedan ${formatoNumero.format(resultado.cobertura)} días. Haz el pedido el ${formatoFecha.format(resultado.fechaPedido)}.`);
    }
    return true;
  }

  poblarInsumos();
  fechaCompra.min = fechaHace(30);
  fechaCompra.max = UI.fechaHoy();
  fechaCompra.value = UI.fechaHoy();
  actualizarCampos();
  demanda = cargarDemanda();
  $("insumo-pedido").addEventListener("change", () => { Valida.limpiar($("insumo-pedido")); actualizarCampos(); });
  $("formulario-pedido").addEventListener("submit", async evento => {
    evento.preventDefault();
    if (!validarFormulario()) return;
    const desbloquear = Valida.bloquearEnvio(formulario.querySelector('[type="submit"]'));
    try { await calcularPedido({ avisarCritico: true }); }
    finally { desbloquear(); }
  });
  renderizarGrafica();
  calcularPedido();
})();
