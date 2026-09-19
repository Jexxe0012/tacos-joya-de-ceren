/**
 * turnos.js — Lógica del módulo Turnos.
 * Requiere: storage.js (DB), guard.js (Guard) cargados antes.
 *
 * Fase 1: setup del sidebar (usuario, avatar, logout) y
 * decisión de qué vista mostrar según el rol de la sesión.
 */

/* ============================================
   Setup inicial del sidebar y de la vista
   ============================================ */

const sesion = Guard.getSesion();

// Guard.requireLogin() en el <head> ya rebotó al login si no hay sesión,
// pero por defensa devolvemos si esto se ejecutara sin sesión.
if (!sesion) {
  throw new Error('No hay sesión activa.');
}

// Nombre y rol en el sidebar
document.getElementById('sidebar-user-name').textContent = sesion.nombre;
document.getElementById('sidebar-user-role').textContent =
  sesion.rol === 'admin' ? 'Dueño / Admin' : 'Empleado';

// Iniciales para el avatar (máximo 2 letras)
const iniciales = sesion.nombre
  .split(' ')
  .filter(Boolean)
  .map(palabra => palabra[0])
  .slice(0, 2)
  .join('')
  .toUpperCase();
document.getElementById('sidebar-user-avatar').textContent = iniciales;

// Mostrar la vista que corresponde al rol
if (sesion.rol === 'admin') {
  document.getElementById('admin-view').hidden = false;
} else {
  document.getElementById('empleado-view').hidden = false;
}

// Botón de logout
document.getElementById('btn-logout').addEventListener('click', () => {
  Guard.logout();
});
