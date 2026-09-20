"use strict";

// Menú y barra superior únicos para todas las pantallas que enlacen este archivo.
(() => {
  const menuLateral = document.getElementById("menu-lateral");
  const barraSuperior = document.getElementById("barra-superior");

  // Las páginas que no usan el panel (por ejemplo, login) pueden omitir estos contenedores.
  if (!menuLateral || !barraSuperior) return;

  // Se calcula desde js/main.js para funcionar en index, pages/ y GitHub Pages.
  const raizProyecto = new URL("../", document.currentScript.src);
  const paginas = [
    { id: "dashboard", nombre: "Dashboard", ruta: "pages/dashboard.html" },
    { id: "recetas", nombre: "Recetas", ruta: "pages/recetas.html" },
    { id: "inventario", nombre: "Inventario", ruta: "pages/inventario.html" },
    { id: "mermas", nombre: "Mermas", ruta: "pages/mermas.html" },
    { id: "turnos", nombre: "Turnos", ruta: "pages/turnos.html" },
    { id: "reportes", nombre: "Reportes", ruta: "pages/reportes.html" },
    { id: "abastecimientos", nombre: "Abastecimiento", ruta: "pages/abastecimientos.html" }
  ];
  const paginaActual = paginas.find(pagina => pagina.id === document.body.dataset.pagina);
  const seccion = document.body.dataset.seccion || "General";
  // Solo es la etiqueta visual. La autenticación y los permisos se integran por separado.
  const rol = document.body.dataset.rol || "Equipo";

  menuLateral.innerHTML = `
    <div class="d-flex align-items-center justify-content-between gap-3 p-4">
      <div class="d-flex align-items-center gap-3">
        <span class="app-marca rounded-3" aria-hidden="true">TJ</span>
        <div>
          <h2 class="h6 mb-1" id="titulo-menu">Tacos Joya</h2>
          <p class="small mb-0 app-texto-lateral">de Cerén</p>
        </div>
      </div>
      <button class="btn-close btn-close-white d-lg-none" type="button"
        data-bs-dismiss="offcanvas" data-bs-target="#menu-lateral" aria-label="Cerrar menú"></button>
    </div>
    <div class="offcanvas-body d-flex flex-column p-3">
      <nav aria-label="Navegación principal">
        <ul class="nav nav-pills flex-column gap-2" id="enlaces-menu"></ul>
      </nav>
      <div class="app-perfil rounded-3 p-3 mt-auto">
        <p class="small fw-semibold mb-1" id="rol-menu"></p>
        <p class="small app-texto-lateral mb-0">Tacos Joya de Cerén</p>
        <button class="btn btn-app-primary w-100 mt-3" type="button" id="btn-cerrar-sesion">
          Cerrar sesión
        </button>
      </div>
    </div>
  `;

  document.getElementById("btn-cerrar-sesion").addEventListener("click", () => {
    // Conserva los datos de los módulos y elimina únicamente la sesión activa.
    localStorage.removeItem("sesion");
    window.location.replace(new URL("pages/login.html", raizProyecto).href);
  });

  const listaMenu = document.getElementById("enlaces-menu");
  paginas.forEach(pagina => {
    const elemento = document.createElement("li");
    elemento.className = "nav-item";
    const enlace = document.createElement("a");
    enlace.className = "nav-link";
    enlace.href = new URL(pagina.ruta, raizProyecto).href;

    const marca = document.createElement("span");
    marca.className = "app-nav-marca";
    marca.setAttribute("aria-hidden", "true");
    const nombre = document.createElement("span");
    nombre.textContent = pagina.nombre;
    enlace.append(marca, nombre);

    if (paginaActual && pagina.id === paginaActual.id) {
      enlace.classList.add("active");
      enlace.setAttribute("aria-current", "page");
    }
    elemento.append(enlace);
    listaMenu.append(elemento);
  });

  barraSuperior.innerHTML = `
    <button class="btn btn-app-secondary d-lg-none" type="button"
      data-bs-toggle="offcanvas" data-bs-target="#menu-lateral" aria-controls="menu-lateral">Menú</button>
    <nav aria-label="Ubicación actual">
      <ol class="breadcrumb small mb-0">
        <li class="breadcrumb-item" id="nombre-pagina"></li>
        <li class="breadcrumb-item active" aria-current="page" id="nombre-seccion"></li>
      </ol>
    </nav>
    <span class="badge rounded-pill app-rol border ms-auto" id="rol-barra"></span>
  `;

  document.getElementById("nombre-pagina").textContent = paginaActual ? paginaActual.nombre : "Tacos Joya de Cerén";
  document.getElementById("nombre-seccion").textContent = seccion;
  document.getElementById("rol-menu").textContent = rol;
  document.getElementById("rol-barra").textContent = rol;
})();
