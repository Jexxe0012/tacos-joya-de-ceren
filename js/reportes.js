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

function mostrarSeleccionFiltros() {
  const rango = calcularRangoPeriodo(filtroPeriodo.value);
  const formatoFecha = new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  const nombreInsumo = filtroInsumo.options[filtroInsumo.selectedIndex].textContent;

  // Confirma la selección; aún no filtra registros ni calcula indicadores.
  resumenFiltros.textContent =
    `Período seleccionado: ${formatoFecha.format(rango.inicio)} al ` +
    `${formatoFecha.format(rango.fin)} · ${nombreInsumo}.`;
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
