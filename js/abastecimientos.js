"use strict";

(() => {
  // Segmento de mayor demanda de la serie usada por Reportes.
  const demandaSemanal = [148, 162, 178, 212, 170];
  const dias = ["Jue", "Vie", "Sáb", "Dom", "Lun"];
  const insumos = [
    { id: "pastor", nombre: "Carne al pastor", unidad: "kg", cantidad: 18.5, porcion: .05, compraHace: 1 },
    { id: "tortillas", nombre: "Tortillas", unidad: "unidades", cantidad: 420, porcion: 1, compraHace: 0 },
    { id: "res", nombre: "Carne de res", unidad: "kg", cantidad: 24, porcion: .055, compraHace: 1 },
    { id: "pollo", nombre: "Pollo", unidad: "kg", cantidad: 38, porcion: .05, compraHace: 1 },
    { id: "queso", nombre: "Queso", unidad: "kg", cantidad: 12, porcion: .012, compraHace: 2 }
  ];
  const formatoNumero = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 1 });
  const formatoFecha = new Intl.DateTimeFormat("es-SV", { day: "numeric", month: "short" });
  const $ = (id) => document.getElementById(id);
  let resultado = null;

  function fechaLocal(valor) { return new Date(`${valor}T12:00:00`); }
  function fechaIso(fecha) { return fecha.toISOString().slice(0, 10); }
  function sumarDias(fecha, cantidad) { const copia = new Date(fecha); copia.setDate(copia.getDate() + cantidad); return copia; }
  function promedioDemanda() { return demandaSemanal.reduce((suma, valor) => suma + valor, 0) / demandaSemanal.length; }
  function demandaParaFecha(fecha) { return demandaSemanal[(fecha.getDay() + 6) % 7]; }
  function textoCantidad(cantidad, unidad) { return `${formatoNumero.format(cantidad)} ${unidad}`; }

  function poblarInsumos() {
    $("insumo-pedido").innerHTML = insumos.map(insumo => `<option value="${insumo.id}">${insumo.nombre}</option>`).join("");
  }

  function actualizarCampos() {
    const insumo = insumos.find(item => item.id === $("insumo-pedido").value);
    $("cantidad-comprada").value = insumo.cantidad;
    $("porcion-estandar").value = insumo.porcion;
    $("unidad-pedido").textContent = insumo.unidad;
    $("unidad-porcion").textContent = insumo.unidad;
  }

  function calcularPedido() {
    const formulario = $("formulario-pedido");
    if (!formulario.reportValidity()) return;
    const insumo = insumos.find(item => item.id === $("insumo-pedido").value);
    const fecha = fechaLocal($("fecha-compra").value);
    const cantidad = Number($("cantidad-comprada").value);
    const porcion = Number($("porcion-estandar").value);
    const consumo = promedioDemanda() * porcion;
    const cobertura = cantidad / consumo;
    const agotamiento = sumarDias(fecha, Math.ceil(cobertura));
    const fechaPedido = sumarDias(agotamiento, -1);
    resultado = { insumo, fecha, cantidad, porcion, consumo, cobertura, agotamiento, fechaPedido };
    mostrarResultado();
    $("mensaje-pedido").textContent = "Cobertura actualizada con el promedio de ventas de los reportes.";
    renderizarTabla();
  }

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

  function proyeccionInsumo(insumo) {
    if (resultado && resultado.insumo.id === insumo.id) return resultado;
    const fecha = sumarDias(new Date(), -insumo.compraHace);
    const consumo = promedioDemanda() * insumo.porcion;
    const cobertura = insumo.cantidad / consumo;
    const agotamiento = sumarDias(fecha, Math.ceil(cobertura));
    return { insumo, fecha, consumo, cobertura, agotamiento, fechaPedido: sumarDias(agotamiento, -1) };
  }

  function renderizarTabla() {
    $("tabla-cobertura").innerHTML = insumos.map(insumo => {
      const proyeccion = proyeccionInsumo(insumo);
      const urgente = proyeccion.cobertura < 3;
      return `<tr><td>${insumo.nombre}</td><td class="fecha-compra">${formatoFecha.format(proyeccion.fecha)}</td><td class="${urgente ? "cobertura-critica" : ""}">${formatoNumero.format(proyeccion.cobertura)} días</td><td><span class="pedido-sugerido ${urgente ? "urgente" : ""}">Pedir ${formatoFecha.format(proyeccion.fechaPedido)}</span></td></tr>`;
    }).join("");
  }

  function renderizarGrafica() {
    const maximo = Math.max(...demandaSemanal);
    $("grafica-demanda").innerHTML = demandaSemanal.map((valor, indice) => `<div class="demanda-barra ${valor === maximo ? "destacada" : ""}"><span class="demanda-valor">${valor}</span><span class="demanda-columna" style="height:${(valor / maximo) * 100}%"></span><span class="demanda-dia">${dias[indice]}</span></div>`).join("");
  }

  poblarInsumos();
  $("fecha-compra").value = fechaIso(new Date());
  actualizarCampos();
  $("insumo-pedido").addEventListener("change", actualizarCampos);
  $("formulario-pedido").addEventListener("submit", evento => { evento.preventDefault(); calcularPedido(); });
  renderizarGrafica();
  calcularPedido();
})();

