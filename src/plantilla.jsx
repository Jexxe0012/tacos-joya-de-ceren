import { createRoot } from "react-dom/client";
import Header from "./components/layout/Header.jsx";
import Sidebar from "./components/layout/Sidebar.jsx";
import { cerrarSesion, prepararNavegacion } from "./navegacion.js";

const menuLateral = document.getElementById("menu-lateral");
const barraSuperior = document.getElementById("barra-superior");

// La entrada actual conecta los componentes con la navegación de las páginas.
if (menuLateral && barraSuperior) {
  const navegacion = prepararNavegacion();
  if (navegacion) {
    createRoot(menuLateral).render(
      <Sidebar {...navegacion} onCerrarSesion={evento => cerrarSesion(evento.currentTarget)} />
    );
    createRoot(barraSuperior).render(<Header {...navegacion} />);
  }
}
