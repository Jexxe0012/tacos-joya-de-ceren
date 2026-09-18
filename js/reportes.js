"use strict";

const formularioFiltros = document.getElementById("formulario-filtros");
const filtroPeriodo = document.getElementById("filtro-periodo");
const filtroInsumo = document.getElementById("filtro-insumo");
const resumenFiltros = document.getElementById("resumen-filtros");

// Los insumos provienen de la maqueta, hasta integrar el catálogo del grupo.
const periodosPermitidos = ["7", "30"];
const insumosPermitidos = ["todos", "res", "pastor", "pollo", "queso", "otros"];

// Incluye el día actual. Por ejemplo, 7 días del 10 al 16, ambos incluidos.
// Se usan fechas locales para evitar cambios de día por conversiones a UTC.
function calcularRangoPeriodo(dias, fechaActual = new Date()) {
  if (!periodosPermitidos.includes(String(dias))) {
    throw new RangeError("El período debe ser de 7 o 30 días.");
  }

  const fin = new Date(
    fechaActual.getFullYear(),
    fechaActual.getMonth(),
    fechaActual.getDate()
  );
  const inicio = new Date(fin);
  inicio.setDate(inicio.getDate() - (Number(dias) - 1));

  return { inicio, fin };
}

function validarFiltros() {
  filtroPeriodo.setCustomValidity(
    periodosPermitidos.includes(filtroPeriodo.value)
      ? ""
      : "Selecciona un período de la lista."
  );

  filtroInsumo.setCustomValidity(
    insumosPermitidos.includes(filtroInsumo.value)
      ? ""
      : "Selecciona un insumo de la lista."
  );

  return formularioFiltros.reportValidity();
}

// Datos temporales: 30 días relativos a hoy, sin modificar el almacenamiento del equipo.
// Al integrar los módulos reales se reemplazará esta fuente, manteniendo el cálculo.
function crearDatosDemostracion(fechaActual = new Date()) {
  const ventasPorDia = [120, 130, 145, 155, 170, 200, 158];
  const insumos = [
    { id: "res", proporcion: 0.30, mermaSemanal: 1.4, costoKg: 8, eficiencia: 0.92 },
    { id: "pastor", proporcion: 0.35, mermaSemanal: 1.1, costoKg: 7, eficiencia: 0.94 },
    { id: "pollo", proporcion: 0.20, mermaSemanal: 0.6, costoKg: 6, eficiencia: 0.96 },
    { id: "queso", proporcion: 0.10, mermaSemanal: 0.4, costoKg: 11, eficiencia: 0.97 },
    { id: "otros", proporcion: 0.05, mermaSemanal: 0.3, costoKg: 5, eficiencia: 0.95 }
  ];

  return Array.from({ length: 30 }, (_, indice) => {
    const fecha = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate());
    fecha.setDate(fecha.getDate() - indice);
    const tacosVendidos = ventasPorDia[indice % ventasPorDia.length];
    return {
      fecha,
      tacosVendidos,
      insumos: insumos.map((insumo) => {
        const consumoEstandarKg = tacosVendidos * insumo.proporcion * 0.05;
        return {
          id: insumo.id,
          consumoEstandarKg,
          consumoRealKg: consumoEstandarKg / insumo.eficiencia,
          mermaKg: insumo.mermaSemanal * tacosVendidos / 1078,
          costoKg: insumo.costoKg
        };
      })
    };
  });
}

function calcularIndicadores(registros, rango, insumoSeleccionado) {
  const finExclusivo = new Date(rango.fin);
  finExclusivo.setDate(finExclusivo.getDate() + 1);
  const dias = registros.filter((registro) =>
    registro.fecha >= rango.inicio && registro.fecha < finExclusivo
  );
  let ventas = 0;
  let mermaKg = 0;
  let costoMerma = 0;
  let consumoEstandarKg = 0;
  let consumoRealKg = 0;

  for (const dia of dias) {
    // Las ventas se suman una vez por día, no una vez por insumo.
    ventas += dia.tacosVendidos;
    for (const insumo of dia.insumos) {
      if (insumoSeleccionado !== "todos" && insumo.id !== insumoSeleccionado) continue;
      mermaKg += insumo.mermaKg;
      costoMerma += insumo.mermaKg * insumo.costoKg;
      consumoEstandarKg += insumo.consumoEstandarKg;
      consumoRealKg += insumo.consumoRealKg;
    }
  }

  return {
    ventas, mermaKg, costoMerma, consumoEstandarKg, consumoRealKg,
    // Se calcula con los totales; no se promedian porcentajes de cada insumo.
    eficiencia: consumoRealKg > 0 ? consumoEstandarKg / consumoRealKg * 100 : null
  };
}

function mostrarIndicadores(indicadores, dias) {
  const enteros = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 0 });
  const decimales = new Intl.NumberFormat("es-SV", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const moneda = new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" });
  document.getElementById("valor-ventas").textContent = enteros.format(indicadores.ventas);
  document.getElementById("detalle-ventas").textContent = `Tacos vendidos en los últimos ${dias} días · todos los insumos.`;
  document.getElementById("valor-mermas").textContent = `${decimales.format(indicadores.mermaKg)} kg`;
  document.getElementById("detalle-mermas").textContent = `Costo estimado: ${moneda.format(indicadores.costoMerma)}.`;
  document.getElementById("valor-eficiencia").textContent = indicadores.eficiencia === null
    ? "Sin datos"
    : `${enteros.format(indicadores.eficiencia)}%`;
  document.getElementById("detalle-eficiencia").textContent = indicadores.eficiencia === null
    ? "No hay consumo real registrado para calcular la eficiencia."
    : `Estándar: ${decimales.format(indicadores.consumoEstandarKg)} kg · real: ${decimales.format(indicadores.consumoRealKg)} kg.`;
}

function mostrarSeleccionFiltros() {
  const fechaActual = new Date();
  const rango = calcularRangoPeriodo(filtroPeriodo.value, fechaActual);
  const indicadores = calcularIndicadores(crearDatosDemostracion(fechaActual), rango, filtroInsumo.value);
  mostrarIndicadores(indicadores, filtroPeriodo.value);
  const formatoFecha = new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  const nombreInsumo = filtroInsumo.options[filtroInsumo.selectedIndex].textContent;

  // El resumen y las tarjetas reflejan únicamente los filtros aplicados.
  resumenFiltros.textContent =
    `Período seleccionado: ${formatoFecha.format(rango.inicio)} al ` +
    `${formatoFecha.format(rango.fin)} · ${nombreInsumo}. Indicadores actualizados con datos de demostración.`;
}

formularioFiltros.addEventListener("submit", (evento) => {
  evento.preventDefault();

  if (validarFiltros()) {
    mostrarSeleccionFiltros();
  }
});

// Limpia el mensaje de error del campo cuando el usuario cambia su selección.
filtroPeriodo.addEventListener("change", () => filtroPeriodo.setCustomValidity(""));
filtroInsumo.addEventListener("change", () => filtroInsumo.setCustomValidity(""));

mostrarSeleccionFiltros();
