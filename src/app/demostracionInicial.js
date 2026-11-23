import { CUENTAS_PRUEBA, ROL_EMPLEADO } from "../services/authService.js";
import { db } from "../services/storage.js";
import { inventarioInicial } from "../modulos/inventario/semillaInventario.js";
import { recetasIniciales } from "../modulos/recetas/semillaRecetas.js";
import { turnosIniciales } from "../modulos/turnos/semillaTurnos.js";
import { ORIGEN_DEMOSTRACION } from "../modulos/ventas/ventasService.js";
import { aFechaLocal, aTextoLocal, diasEntre, fechaHoyLocal } from "../utils/fechas.js";

const SIN_ACTIVIDAD = ["ventas", "movimientos", "mermas", "vinculosInsumos", "solicitudes"];

function trasladarFecha(texto, dias) {
  const fecha = aFechaLocal(texto.slice(0, 10));
  fecha.setDate(fecha.getDate() + dias);
  return aTextoLocal(fecha) + texto.slice(10);
}

function coincideSemilla(guardados, esperados) {
  return guardados.length === esperados.length && esperados.every((esperado, indice) => {
    const guardado = guardados[indice];
    if (!guardado || guardado.id == null) return false;
    const { id, ...campos } = guardado;
    return Object.keys(campos).length === Object.keys(esperado).length
      && Object.entries(esperado).every(([clave, valor]) => JSON.stringify(campos[clave]) === JSON.stringify(valor));
  });
}

function coincideInventario(productos) {
  const primeraCaducidad = productos[0]?.caducidad;
  if (!aFechaLocal(primeraCaducidad)) return false;
  const primeraReferencia = inventarioInicial(dias => dias)[0].caducidad;
  return coincideSemilla(productos, inventarioInicial(dias => trasladarFecha(primeraCaducidad, dias - primeraReferencia)));
}

export function puedeCargarDemostracion() {
  if (SIN_ACTIVIDAD.some(clave => localStorage.getItem(clave) !== null)) return false;
  const usuarios = db.getAll("usuarios");
  if (!coincideSemilla(usuarios, CUENTAS_PRUEBA)) return false;

  // Solo se sustituye un catálogo anterior si contiene exactamente el material
  // de ejemplo. Una lista vacía, editada o dañada se conserva tal como está.
  if (localStorage.getItem("recetas") !== null) {
    const recetas = db.getAll("recetas");
    const alta = recetas[0]?.creadaEn;
    if (!Number.isFinite(alta) || !coincideSemilla(recetas, recetasIniciales(alta))) return false;
  }
  if (localStorage.getItem("inventario") !== null && !coincideInventario(db.getAll("inventario"))) return false;
  if (localStorage.getItem("turnos") !== null) {
    const turnos = db.getAll("turnos");
    const inicio = aFechaLocal(turnos[0]?.fecha);
    const empleado = usuarios.find(usuario => usuario.rol === ROL_EMPLEADO);
    if (!inicio || !coincideSemilla(turnos, turnosIniciales(empleado.id, inicio))) return false;
  }
  return true;
}

export async function cargarDemostracion() {
  if (!puedeCargarDemostracion()) return;
  const { default: datos } = await import("../datos/operacion-demostracion.json", { with: { type: "json" } });
  if (!puedeCargarDemostracion()) return;

  const dias = diasEntre(datos.metadatos.fechaCorte, fechaHoyLocal());
  const fecha = valor => trasladarFecha(valor, dias);
  const cuentas = db.getAll("usuarios");
  const empleado = cuentas.find(usuario => usuario.rol === ROL_EMPLEADO);
  const [personaInicial, ...otrasPersonas] = datos.personal;
  const idPersona = id => id === personaInicial.id ? empleado.id : id;

  const colecciones = {
    usuarios: [...cuentas, ...otrasPersonas.map(({ id, nombre, rol }) => ({ id, nombre, rol }))],
    recetas: datos.recetas.map(receta => ({
      ...receta, creadaEn: fecha(receta.creadaEn), actualizadaEn: fecha(receta.actualizadaEn)
    })),
    inventario: datos.inventario.map(producto => ({
      ...producto, caducidad: producto.caducidad ? fecha(producto.caducidad) : ""
    })),
    turnos: datos.turnos.map(turno => ({
      ...turno, empleadoId: idPersona(turno.empleadoId), fecha: fecha(turno.fecha)
    })),
    ventas: datos.ventas.map(venta => ({
      ...venta, fecha: fecha(venta.fecha), creadoEn: fecha(venta.creadoEn),
      registradoPor: idPersona(venta.registradoPor), origen: ORIGEN_DEMOSTRACION
    })),
    movimientos: datos.movimientos.map(movimiento => ({
      ...movimiento, fecha: fecha(movimiento.fecha),
      usuario: movimiento.usuario === personaInicial.nombre ? empleado.nombre : movimiento.usuario
    })),
    mermas: datos.mermas.map(merma => ({
      ...merma, fecha: fecha(merma.fecha), reportadoPor: idPersona(merma.reportadoPor),
      responsable: merma.responsable === personaInicial.nombre ? empleado.nombre : merma.responsable
    })),
    vinculosInsumos: datos.vinculosInsumos
  };
  db.enLote(Object.keys(colecciones), () => {
    for (const [clave, registros] of Object.entries(colecciones)) db.reemplazarColeccion(clave, registros);
  });
}
