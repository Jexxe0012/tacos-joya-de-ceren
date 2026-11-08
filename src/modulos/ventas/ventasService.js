import { db } from "../../services/storage.js";
import { leerSesion } from "../../services/authService.js";
import { fechaHoyLocal, aFechaLocal } from "../../utils/fechas.js";
import { fecha, numero } from "../../utils/validaciones.js";

export const mediosPago = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia" };
export const moneda = valor => new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(valor);
export const recetasVendibles = recetas => recetas.filter(item => item?.estado === "activa"
  && Number.isFinite(Number(item.precioVenta)) && Number(item.precioVenta) > 0);

export function validarPedido(pedido, recetas) {
  const errores = {};
  const errorFecha = fecha(pedido.fecha, { noFutura: true, maxDiasAtras: 7 });
  if (errorFecha || !aFechaLocal(pedido.fecha)) errores.fecha = errorFecha || "Selecciona una fecha válida.";
  if (!Object.hasOwn(mediosPago, pedido.metodoPago)) errores.metodoPago = "Selecciona un método de pago válido.";
  if (!pedido.lineas.length) errores.lineas = "Agrega al menos una receta al pedido.";
  const disponibles = recetasVendibles(recetas);
  pedido.lineas.forEach((linea, indice) => {
    if (!disponibles.some(item => String(item.id) === linea.recetaId)) errores[`receta-${indice}`] = "Selecciona una receta activa.";
    const cantidad = numero(linea.cantidad, { min: 1, max: 500, entero: true });
    if (cantidad) errores[`cantidad-${indice}`] = cantidad;
    if (!Number.isFinite(Number(linea.precioUnitario)) || Number(linea.precioUnitario) <= 0) {
      errores[`receta-${indice}`] = "La receta necesita un precio válido.";
    }
  });
  const total = pedido.lineas.reduce((suma, linea) => suma + Math.round(Number(linea.cantidad) * Number(linea.precioUnitario) * 100) / 100, 0);
  if (!Number.isFinite(total) || total <= 0 || total > 1000000) errores.total = "El total debe ser mayor que cero y menor o igual a $1,000,000.";
  return errores;
}

export function eliminarVentasDia(fechaVenta) {
  if (leerSesion()?.rol !== "admin") throw new Error("Solo el administrador puede eliminar ventas.");
  if (!aFechaLocal(fechaVenta)) throw new Error("Selecciona una fecha válida.");
  const ventas = db.getAll("ventas").filter(venta => venta.fecha === fechaVenta);
  return db.enLote(["ventas"], () => ventas.forEach(venta => db.remove("ventas", venta.id)));
}

export function registrarPedido(pedido) {
  const sesion = leerSesion();
  if (!sesion) throw new Error("Inicia sesión para registrar ventas.");
  const recetas = db.getAll("recetas");
  if (Object.keys(validarPedido(pedido, recetas)).length) throw new Error("Revisa los campos del pedido.");
  if (db.getAll("ventas").some(venta => venta.pedidoId === pedido.pedidoId)) {
    throw new Error("Este pedido ya está guardado. Actualiza el formulario antes de registrar otro.");
  }
  const ahora = new Date();
  const hora = ahora.toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit", hour12: false });
  return db.enLote(["ventas"], () => pedido.lineas.map(linea => {
    const receta = recetas.find(item => String(item.id) === linea.recetaId);
    return db.create("ventas", {
      pedidoId: pedido.pedidoId, fecha: pedido.fecha, hora, metodoPago: pedido.metodoPago,
      recetaId: String(receta.id), recetaNombre: receta.nombre, cantidad: Number(linea.cantidad),
      precioUnitario: Number(linea.precioUnitario),
      total: Math.round(Number(linea.cantidad) * Number(linea.precioUnitario) * 100) / 100,
      registradoPor: sesion.id, creadoEn: ahora.toISOString(), ejemplo: false
    });
  }));
}

export function pedidoInicial() {
  return { pedidoId: crypto.randomUUID(), fecha: fechaHoyLocal(), metodoPago: "efectivo",
    lineas: [{ id: crypto.randomUUID(), recetaId: "", cantidad: "1", precioUnitario: "" }] };
}

export function agruparPedidos(ventas) {
  const grupos = new Map();
  ventas.forEach((venta, indice) => {
    const id = venta.pedidoId || venta.id || `antiguo-${indice}`;
    if (!grupos.has(id)) grupos.set(id, { id, fecha: venta.fecha, hora: venta.hora || "—",
      metodoPago: mediosPago[venta.metodoPago] || "Sin registro", total: 0, productos: [] });
    const grupo = grupos.get(id);
    grupo.total += Number(venta.total) || 0;
    grupo.productos.push(`${venta.cantidad} × ${venta.recetaNombre || "Receta"}${venta.ejemplo ? " (ejemplo)" : ""}`);
  });
  return [...grupos.values()].reverse();
}
