/**
 * CapaModal — la ventana propia de Inventario.
 *
 * No usa el Modal de Bootstrap: Inventario tiene su propio diseño de
 * modal en css/inventario.css (.modal-overlay y .modal-card), y se
 * conserva tal cual para que la pantalla no cambie de aspecto.
 *
 * Igual que el otro Modal, se dibuja desde el estado: cierra con Escape
 * y con el fondo, y devuelve el foco al cerrarse.
 */

import { useEffect, useRef } from "react";

function CapaModal({ titulo, subtitulo, idTitulo, ancho = false, alCerrar, children, enfocarAlAbrir }) {
  const tarjeta = useRef(null);
  const focoAnterior = useRef(null);

  useEffect(() => {
    focoAnterior.current = document.activeElement;

    const alTeclear = evento => {
      if (evento.key === "Escape") alCerrar?.();
    };
    document.addEventListener("keydown", alTeclear);

    (enfocarAlAbrir?.current ?? tarjeta.current)?.focus();

    return () => {
      document.removeEventListener("keydown", alTeclear);
      focoAnterior.current?.focus?.();
    };
  }, [alCerrar, enfocarAlAbrir]);

  return (
    <div className="modal-overlay"
      onMouseDown={evento => { if (evento.target === evento.currentTarget) alCerrar?.(); }}>
      <div className={`modal-card${ancho ? " modal-card-wide" : ""}`} role="dialog" aria-modal="true"
        aria-labelledby={idTitulo} ref={tarjeta} tabIndex={-1}>
        <h2 id={idTitulo}>{titulo}</h2>
        {subtitulo && <p className="modal-subtitle">{subtitulo}</p>}
        {children}
      </div>
    </div>
  );
}

export default CapaModal;
