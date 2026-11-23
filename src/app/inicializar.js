import { ROL_EMPLEADO, sembrarCuentasPrueba } from "../services/authService.js";
import { db } from "../services/storage.js";
import { aFechaLocal, aTextoLocal, diasEntre, fechaHoyLocal } from "../utils/fechas.js";

let arranque;
export function inicializarDatos() {
  arranque ??= prepararDatos();
  return arranque;
}

async function prepararDatos() {
  // Vite sirve el JSON como JavaScript. Node requiere el atributo en las pruebas.
  const opciones = import.meta.env ? undefined : { with: { type: "json" } };
  const { default: datos } = await import("../datos/operacion-inicial.json", opciones);
  const desplazamiento = diasEntre(datos.metadatos.fechaCorte, fechaHoyLocal());

  function fecha(valor) {
    const dia = aFechaLocal(valor.slice(0, 10));
    dia.setDate(dia.getDate() + desplazamiento);
    return aTextoLocal(dia) + valor.slice(10);
  }

  sembrarCuentasPrueba();
  const empleado = db.getAll("usuarios").find(usuario =>
    usuario.rol === ROL_EMPLEADO && usuario.correo === "empleado@joyadeceren.sv"
  );
  const [personaInicial, ...restoPersonal] = datos.personal;
  const idPersona = id => empleado && id === personaInicial.id ? empleado.id : id;
  const nombrePersona = nombre => empleado && nombre === personaInicial.nombre ? empleado.nombre : nombre;

  const colecciones = {
    personal: empleado ? restoPersonal : datos.personal,
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
      registradoPor: idPersona(venta.registradoPor)
    })),
    movimientos: datos.movimientos.map(movimiento => ({
      ...movimiento, fecha: fecha(movimiento.fecha), usuario: nombrePersona(movimiento.usuario)
    })),
    mermas: datos.mermas.map(merma => ({
      ...merma, fecha: fecha(merma.fecha), reportadoPor: idPersona(merma.reportadoPor),
      responsable: nombrePersona(merma.responsable)
    })),
    solicitudes: [],
    vinculosInsumos: datos.vinculosInsumos
  };

  db.enLote(Object.keys(colecciones), () => {
    for (const [clave, registros] of Object.entries(colecciones)) db.reemplazarColeccion(clave, registros);
  });
}
