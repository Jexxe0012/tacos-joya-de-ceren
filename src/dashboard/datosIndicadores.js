import {
  aFechaLocal,
  aTextoLocal,
  fechaHoyLocal,
  fechaLegible
} from "../utils/fechas.js";
import { listarInsumos } from "../services/insumosService.js";
import { calcularReporte } from "../modulos/reportes/modeloReporte.js";
import { agruparPedidos } from "../modulos/ventas/ventasService.js";

export function obtenerResumenDashboard(registros, hoy = fechaHoyLocal()) {
  const fechas = Array.from({ length: 7 }, (_, indice) => {
    const dia = aFechaLocal(hoy);
    dia.setDate(dia.getDate() + indice - 6);
    return aTextoLocal(dia);
  });
  const ventas = registros.ventas.filter((venta) => venta?.ejemplo !== true);
  const recientes = ventas.filter(
    (venta) => fechas.includes(venta?.fecha) && Number(venta.cantidad) > 0
  );
  const dias = fechas.map((fecha) => ({
    fecha,
    etiqueta: fechaLegible(fecha, { weekday: "short", day: "numeric" }),
    cantidad: recientes
      .filter((venta) => venta.fecha === fecha)
      .reduce((total, venta) => total + Number(venta.cantidad), 0)
  }));
  const promedio = recientes.length
    ? recientes.reduce((total, venta) => total + Number(venta.cantidad), 0) / 7
    : null;
  const reporte = calcularReporte(
    {
      periodo: "personalizado",
      insumo: "todos",
      receta: "todas",
      fechaInicio: fechas[0],
      fechaFin: hoy
    },
    { ...registros, ventas }
  );
  const cantidades = new Map();
  let recetasSinFicha = 0;
  const catalogo = new Map(
    listarInsumos().map((insumo) => [insumo.id, insumo])
  );
  recientes.forEach((venta) => {
    const receta = registros.recetas.find(
      (item) => String(item.id) === String(venta.recetaId)
    );
    if (
      !receta ||
      !(Number(receta.porciones) > 0) ||
      !receta.ingredientes?.length
    ) {
      recetasSinFicha++;
      return;
    }
    receta.ingredientes.forEach((ingrediente) => {
      const insumo = catalogo.get(ingrediente.insumoId);
      if (!insumo || !(Number(ingrediente.cantidad) > 0)) {
        recetasSinFicha++;
        return;
      }
      if (!cantidades.has(insumo.id))
        cantidades.set(insumo.id, { ...insumo, cantidad: 0 });
      cantidades.get(insumo.id).cantidad +=
        (Number(ingrediente.cantidad) * Number(venta.cantidad)) /
        Number(receta.porciones) /
        7;
    });
  });
  const consumo = [...cantidades.values()];
  const kg = consumo
    .filter((item) => item.unidad === "kg")
    .reduce((total, item) => total + item.cantidad, 0);
  const inventarioValido = registros.inventario.filter(
    (item) =>
      Number.isFinite(Number(item.cantidad)) &&
      Number(item.cantidad) >= 0 &&
      Number.isFinite(Number(item.stockMinimo)) &&
      Number(item.stockMinimo) >= 0
  );
  const criticos = inventarioValido
    .filter(
      (item) =>
        Number(item.cantidad) <= 0 ||
        (Number(item.stockMinimo) > 0 &&
          Number(item.cantidad) <= Number(item.stockMinimo))
    )
    .sort(
      (a, b) =>
        Number(a.cantidad) / (Number(a.stockMinimo) || 1) -
        Number(b.cantidad) / (Number(b.stockMinimo) || 1)
    );
  const alertas = criticos.map((item) => ({
    titulo:
      Number(item.cantidad) === 0 ? "Inventario agotado" : "Inventario bajo",
    mensaje: `${item.nombre}: ${item.cantidad} ${item.unidad}. Mínimo: ${item.stockMinimo}.`
  }));
  if (reporte.indicadores.cantidadMermas)
    alertas.push({
      titulo: "Merma registrada",
      mensaje: `${reporte.indicadores.cantidadMermas} registros en los últimos siete días.`
    });
  return {
    dias,
    promedio,
    consumo,
    kg: consumo.some((item) => item.unidad === "kg") ? kg : null,
    recetasSinFicha,
    reporte,
    criticos,
    inventarioValido,
    alertas,
    pedidos: agruparPedidos(
      ventas.filter((venta) => venta.fecha === hoy)
    ).slice(0, 5)
  };
}
