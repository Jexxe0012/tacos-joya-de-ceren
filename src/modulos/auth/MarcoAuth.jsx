/**
 * MarcoAuth — la pantalla partida del login y el registro.
 *
 * Es la distribución propia de la autenticación: no pasa por AppLayout,
 * porque todavía no hay sesión y no hay menú que mostrar. El panel
 * izquierdo presenta la marca y el derecho recibe el formulario.
 *
 * Los estilos compartidos del login y del registro viven en css/login.css.
 */

import { useEffect } from "react";
import "../../../css/login.css";

const CARACTERISTICAS = [
  "Porciones estandarizadas",
  "Mermas con alertas",
  "Proyección de demanda",
  "Turnos rotativos"
];

function MarcoAuth({ titulo, subtitulo, children, tituloPagina }) {
  // La clase del <body> ya no viene escrita en el HTML: la pone la ruta.
  useEffect(() => {
    document.body.classList.add("login-page");
    document.title = `${tituloPagina} — Tacos Joya de Cerén`;
    return () => {
      document.body.classList.remove("login-page");
      document.title = "Tacos Joya de Cerén";
    };
  }, [tituloPagina]);

  return (
    <main className="login-layout">
      <section className="login-left">
        <div className="login-logo">TJ</div>
        <h1>Tacos Joya de Cerén</h1>
        <p className="login-subtitle">Control de inventario y operación de la taquería</p>
        <ul className="login-features">
          {CARACTERISTICAS.map(texto => <li key={texto}>{texto}</li>)}
        </ul>
      </section>

      <section className="login-right">
        <div className="login-card">
          <h2>{titulo}</h2>
          <p>{subtitulo}</p>
          {children}
        </div>
      </section>
    </main>
  );
}

export default MarcoAuth;
