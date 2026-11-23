export function numeroReporte(valor) {
  if (!["string", "number"].includes(typeof valor) || String(valor).trim() === "") return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

export function unidadReporte(valor) {
  const unidad = String(valor || "").trim().toLowerCase();
  const alias = { litros: "l", litro: "l", unidades: "unidad" };
  return Object.hasOwn(alias, unidad) ? alias[unidad] : unidad;
}

export const pesoEnKgReporte = { kg: 1, g: 0.001, lb: 0.45359237 };
export const volumenEnLitrosReporte = { l: 1, ml: 0.001 };

