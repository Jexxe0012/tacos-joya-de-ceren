/**
 * modulos — datos de navegación de la aplicación. Solo datos.
 *
 * Este archivo no importa componentes a propósito: Sidebar y AppLayout lo
 * necesitan para dibujar el menú, y Rutas.jsx importa los componentes. Si
 * las dos cosas vivieran juntas, el menú y las rutas se importarían en
 * círculo.
 */

import { ROL_ADMIN } from "../services/authService.js";

/**
 * Cada módulo con su ruta, el nombre del menú, la sección que muestra la
 * barra superior y quién puede verlo.
 *
 * nombreEmpleado cambia el texto del menú solo para el empleado: sus
 * turnos se llaman "Mis turnos" en su interfaz.
 */
export const MODULOS = [
  { id: "dashboard", nombre: "Dashboard", ruta: "/dashboard", seccion: "Resumen", soloAdmin: true },
  { id: "recetas", nombre: "Recetas", ruta: "/recetas", seccion: "Gestión" },
  { id: "inventario", nombre: "Inventario", ruta: "/inventario", seccion: "Operación" },
  { id: "mermas", nombre: "Mermas", ruta: "/mermas", seccion: "Inventario" },
  { id: "turnos", nombre: "Turnos", nombreEmpleado: "Mis turnos", ruta: "/turnos", seccion: "Programación" },
  { id: "reportes", nombre: "Reportes", ruta: "/reportes", seccion: "Operación", soloAdmin: true },
  { id: "ventas", nombre: "Ventas del día", ruta: "/ventas", seccion: "Operación" },
  { id: "abastecimientos", nombre: "Abastecimiento", ruta: "/abastecimientos", seccion: "Proyección", soloAdmin: true }
];

/** Orden del menú del empleado. Empieza por sus turnos, que es su inicio. */
export const ORDEN_EMPLEADO = ["turnos", "recetas", "ventas", "inventario", "mermas"];

/** Nombre del rol tal como se muestra en la barra y en el menú. */
export function nombreRol(rol) {
  return rol === ROL_ADMIN ? "Dueño / Admin" : "Empleado";
}

/**
 * Módulos visibles para ese rol, en el orden en que van en el menú.
 * El administrador ve el catálogo completo; el empleado, su propio orden
 * y con el nombre que le corresponde.
 */
export function modulosDeRol(rol) {
  if (rol === ROL_ADMIN) return MODULOS.map(modulo => ({ ...modulo, nombre: modulo.nombre }));
  return ORDEN_EMPLEADO
    .map(id => MODULOS.find(modulo => modulo.id === id))
    .filter(modulo => modulo && !modulo.soloAdmin)
    .map(modulo => ({ ...modulo, nombre: modulo.nombreEmpleado ?? modulo.nombre }));
}

/** El módulo al que corresponde una ruta, para el título y la sección. */
export function moduloDeRuta(ruta) {
  return MODULOS.find(modulo => ruta === modulo.ruta || ruta.startsWith(`${modulo.ruta}/`));
}
