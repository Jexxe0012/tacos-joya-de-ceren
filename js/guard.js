/** Protección de las páginas de la fase 2 con la sesión simulada del equipo. */
const Guard = (() => {
  // La raíz se obtiene desde este archivo para funcionar desde index, pages y GitHub Pages.
  const raiz = new URL("../", document.currentScript.src);

  function redirigir(pagina) {
    document.documentElement.hidden = true;
    window.location.replace(new URL(`pages/${pagina}.html`, raiz).href);
  }

  return {
    getSesion() {
      try {
        const sesion = JSON.parse(localStorage.getItem("sesion"));
        return sesion && ["admin", "empleado"].includes(sesion.rol) ? sesion : null;
      } catch {
        return null;
      }
    },

    irAlInicio() {
      const sesion = this.getSesion();
      redirigir(sesion ? (sesion.rol === "admin" ? "dashboard" : "turnos") : "login");
    },

    requireLogin() {
      if (this.getSesion()) return true;
      redirigir("login");
      return false;
    },

    requireRole(rolEsperado) {
      if (!this.requireLogin()) return false;
      if (this.getSesion().rol === rolEsperado) return true;
      this.irAlInicio();
      return false;
    },

    logout() {
      localStorage.removeItem("sesion");
      redirigir("login");
    }
  };
})();
