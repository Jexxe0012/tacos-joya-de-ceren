import { aFechaLocal as fechaLocalReporte } from "../../utils/fechas.js";

// Las fechas de ventas y mermas pueden ser días locales o marcas de tiempo ISO.
export function fechaRegistroReporte(valor) {
  if (typeof valor !== "string" || !fechaLocalReporte(valor.slice(0, 10))) return null;
  if (valor.length === 10) return fechaLocalReporte(valor);
  if (valor[10] !== "T") return null;
  const instante = new Date(valor);
  return Number.isFinite(instante.getTime())
    ? new Date(instante.getFullYear(), instante.getMonth(), instante.getDate()) : null;
}

