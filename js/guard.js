/**
 * guard.js — Protección de páginas por sesión y rol.
 *
 * Debe cargarse en el <head> de cada página protegida y llamarse
 * ANTES de que el resto del HTML se dibuje, para no mostrar la página
 * al usuario aunque sea por un instante.
 *
 * Uso típico:
 *   Guard.requireLogin();          // páginas que solo requieren estar logueado
 *   Guard.requireRole('admin');    // páginas solo para admin
 */
const Guard = {

  /**
   * Lee la sesión activa desde localStorage.
   * Devuelve el objeto {id, correo, nombre, rol, loginAt} o null.
   * Si el JSON está corrupto, devuelve null y avisa por consola.
   */
  getSesion() {
    const raw = localStorage.getItem('sesion');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.error('Sesión corrupta en localStorage:', err);
      return null;
    }
  },

  /**
   * Redirige al login si no hay sesión activa.
   * Usar en páginas accesibles a cualquier rol logueado.
   */
  requireLogin() {
    if (!this.getSesion()) {
      window.location.href = 'login.html';
    }
  },

  /**
   * Redirige si no hay sesión, o si el rol de la sesión no coincide
   * con el rol esperado. En caso de rol equivocado, redirige a la
   * página correcta para su rol real (no lo tira al login).
   */
  requireRole(rolEsperado) {
    const sesion = this.getSesion();
    if (!sesion) {
      window.location.href = 'login.html';
      return;
    }
    if (sesion.rol !== rolEsperado) {
      // No es el rol que espera esta página — mandarlo al home de su rol
      if (sesion.rol === 'admin') {
        window.location.href = 'dashboard.html';
      } else {
        window.location.href = 'turnos.html';
      }
    }
  },

  /**
   * Cierra la sesión: borra la clave de localStorage y redirige al login.
   */
  logout() {
    localStorage.removeItem('sesion');
    window.location.href = 'login.html';
  }
};
