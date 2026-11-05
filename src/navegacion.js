const catalogo = [
  { id: "dashboard", nombre: "Dashboard" },
  { id: "recetas", nombre: "Recetas" },
  { id: "inventario", nombre: "Inventario" },
  { id: "mermas", nombre: "Mermas" },
  { id: "turnos", nombre: "Turnos" },
  { id: "reportes", nombre: "Reportes" },
  { id: "ventas", nombre: "Ventas del día" },
  { id: "abastecimientos", nombre: "Abastecimiento" }
];
const ordenEmpleado = ["turnos", "recetas", "ventas", "inventario", "mermas"];

export function prepararNavegacion() {
  if (!Guard.requireLogin()) return null;
  const sesion = Guard.getSesion();
  const esAdmin = sesion.rol === "admin";
  const visibles = esAdmin ? catalogo : ordenEmpleado.map(id => catalogo.find(pagina => pagina.id === id));
  const paginas = visibles.map(({ id, nombre }) => ({
    id,
    nombre: !esAdmin && id === "turnos" ? "Mis turnos" : nombre,
    href: `${id}.html`
  }));
  const paginaActual = paginas.find(pagina => pagina.id === document.body.dataset.pagina);
  if (!paginaActual) {
    Guard.irAlInicio();
    return null;
  }

  const rol = esAdmin ? "Dueño / Admin" : "Empleado";
  document.body.dataset.rol = rol;
  document.title = `${paginaActual.nombre} | Tacos Joya de Cerén`;

  return {
    paginas,
    paginaActual,
    seccion: document.body.dataset.seccion || "General",
    rol,
    perfil: sesion.nombre ? `${sesion.nombre} · ${rol}` : rol
  };
}

export async function cerrarSesion(boton) {
  if (boton.disabled) return;
  const desbloquear = Valida.bloquearEnvio(boton);
  try {
    const confirmado = await UI.confirmar({
      titulo: "¿Quieres cerrar sesión?",
      texto: "Volverás al inicio de sesión. Los datos guardados se conservarán.",
      boton: "Sí, cerrar sesión"
    });
    if (confirmado) Guard.logout();
  } finally {
    desbloquear();
  }
}
