import {
  aFechaLocal,
  aTextoLocal,
  fechaHoyLocal,
  fechaLegible
} from "../../utils/fechas.js";
import { fecha, numero } from "../../utils/validaciones.js";

// Cantidades de referencia del simulador original; no son existencias de Inventario.
export const insumosReferencia = [
  {
    id: "pastor",
    nombre: "Carne al pastor",
    unidad: "kg",
    cantidad: 18.5,
    porcion: 0.05,
    compraHace: 1
  },
  {
    id: "tortillas",
    nombre: "Tortillas",
    unidad: "unidades",
    cantidad: 420,
    porcion: 1,
    compraHace: 0
  },
  {
    id: "res",
    nombre: "Carne de res",
    unidad: "kg",
    cantidad: 24,
    porcion: 0.055,
    compraHace: 1
  },
  {
    id: "pollo",
    nombre: "Pollo",
    unidad: "kg",
    cantidad: 38,
    porcion: 0.05,
    compraHace: 1
  },
  {
    id: "queso",
    nombre: "Queso",
    unidad: "kg",
    cantidad: 12,
    porcion: 0.012,
    compraHace: 2
  }
];
export function sumarDias(texto, dias) {
  const valor = aFechaLocal(texto);
  valor.setDate(valor.getDate() + dias);
  return aTextoLocal(valor);
}
export function cargarDemanda(ventas, hoy = fechaHoyLocal()) {
  const fechas = Array.from({ length: 7 }, (_, indice) =>
    sumarDias(hoy, indice - 6)
  );
  const valores = new Map(fechas.map((fecha) => [fecha, 0]));
  let real = false;
  ventas.forEach((venta) => {
    if (venta?.ejemplo === true || !valores.has(venta?.fecha?.slice(0, 10)))
      return;
    const cantidad = Number(venta.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 500) return;
    const fecha = venta.fecha.slice(0, 10);
    valores.set(fecha, valores.get(fecha) + cantidad);
    real = true;
  });
  const serie = real ? [...valores.values()] : [148, 162, 178, 212, 170];
  return {
    valores: serie,
    etiquetas: real
      ? fechas.map((fecha) =>
          fechaLegible(fecha, { weekday: "short", day: "numeric" })
        )
      : ["Jue", "Vie", "Sáb", "Dom", "Lun"],
    promedio: serie.reduce((suma, valor) => suma + valor, 0) / serie.length,
    real
  };
}
function paso(valor, min, max, incremento) {
  const fallo = numero(valor, { min, max });
  if (fallo) return fallo;
  return Math.abs(
    Number(valor) / incremento - Math.round(Number(valor) / incremento)
  ) < 1e-7
    ? ""
    : `Usa incrementos de ${incremento}.`;
}
export function validarProyeccion(datos) {
  const errores = {};
  if (!insumosReferencia.some((item) => item.id === datos.insumoId))
    errores.insumoId = "Selecciona un insumo válido.";
  const reglas = {
    fecha: fecha(datos.fecha, { noFutura: true, maxDiasAtras: 30 }),
    cantidad: paso(datos.cantidad, 0.1, 5000, 0.1),
    porcion: paso(datos.porcion, 0.001, 10, 0.001)
  };
  for (const [campo, mensaje] of Object.entries(reglas))
    if (mensaje) errores[campo] = mensaje;
  return errores;
}
export function proyectarCobertura(datos, demanda) {
  const insumo = insumosReferencia.find((item) => item.id === datos.insumoId);
  if (
    !insumo ||
    !aFechaLocal(datos.fecha) ||
    !(Number(datos.cantidad) > 0) ||
    !(Number(datos.porcion) > 0) ||
    !(demanda.promedio > 0)
  )
    return null;
  const consumo = demanda.promedio * Number(datos.porcion);
  const cobertura = Number(datos.cantidad) / consumo;
  const agotamiento = sumarDias(datos.fecha, Math.ceil(cobertura));
  return {
    ...datos,
    insumo,
    consumo,
    cobertura,
    agotamiento,
    fechaPedido: sumarDias(agotamiento, -1),
    critico: cobertura < 3
  };
}
export function camposIniciales(insumo = insumosReferencia[0]) {
  return {
    insumoId: insumo.id,
    fecha: fechaHoyLocal(),
    cantidad: String(insumo.cantidad),
    porcion: String(insumo.porcion)
  };
}
