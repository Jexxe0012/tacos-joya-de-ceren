/**
 * main.jsx — la única entrada de la aplicación.
 *
 * Aquí está el único createRoot del proyecto. Antes había uno por página
 * (plantilla, dashboard, reportes) y cada uno montaba su pedazo dentro de
 * un HTML distinto. Ahora el árbol completo cuelga de este punto.
 *
 * Los estilos, el arranque de datos y App se cargan una sola vez.
 */

// Bootstrap primero: los estilos propios se cargan después para poder
// ajustar sus valores, igual que en las páginas anteriores.
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";

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

inicializarDatos();

const raiz = document.getElementById("raiz");

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>
);
