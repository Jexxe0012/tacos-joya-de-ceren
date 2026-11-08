/**
 * main.jsx — la única entrada de la aplicación.
 *
 * Aquí está el único createRoot del proyecto. Antes había uno por página
 * (plantilla, dashboard, reportes) y cada uno montaba su pedazo dentro de
 * un HTML distinto. Ahora el árbol completo cuelga de este punto.
 *
 * Orden del arranque:
 *   1. Las librerías y los estilos, desde npm, no desde un CDN.
 *   2. Los globales de compatibilidad, para el código que todavía no se
 *      ha migrado. Se retiran al cerrar la migración.
 *   3. La siembra de datos, una sola vez y antes del primer render.
 *   4. El render de la aplicación.
 */

// Bootstrap primero: los estilos propios se cargan después para poder
// ajustar sus valores, igual que en las páginas anteriores.
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import "../css/main.css";
import "../css/dashboard.css";
import "../css/recetas.css";
import "../css/inventario.css";
import "../css/mermas.css";
import "../css/turnos.css";
import "../css/reportes.css";
import "../css/ventas.css";
import "../css/abastecimientos.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { inicializarDatos } from "./app/inicializar.js";
import { instalarGlobales } from "./compat/globales.js";

instalarGlobales();
inicializarDatos();

const raiz = document.getElementById("raiz");

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>
);
